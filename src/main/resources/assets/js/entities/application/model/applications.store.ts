import { map, onMount } from 'nanostores';

import { fetchApplication, fetchApplications } from '../api/applications.api';
import type { Application } from './application.types';

export type ApplicationsState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly Application[];
  error?: string;
};

export const $applications = map<ApplicationsState>({ status: 'loading', items: [] });

// ! Refresh and, later, server events retrigger a load, so the previous one is cancelled and its
// ! answer dropped: without this the slower of two requests decides what the list shows.
let pending: AbortController | undefined;

// A remount that lands mid-load joins the request in flight rather than starting a second one.
let inFlight: Promise<void> | undefined;

// One refetch per key at a time, independent of the full reload above: a full reload that lands
// after a per-key answer simply overwrites it with the same server state.
const refreshing = new Map<string, AbortController>();

/** Reloads the list whatever the store holds: the Refresh button, and later a server event. */
export function refreshApplications(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  // ! Only an empty list waits on a skeleton. A reload the user did not ask for — a reconnect, an
  // ! install event elsewhere — must not blank a list that is already on screen, and Refresh over a
  // ! loaded list reads as a flash for no gain.
  if ($applications.get().items.length === 0) {
    $applications.setKey('status', 'loading');
  }

  inFlight = fetchApplications(signal)
    .match(
      (items) => {
        if (!signal.aborted) {
          $applications.set({ status: 'ready', items });
        }
      },
      (error) => {
        if (!signal.aborted) {
          $applications.set({ status: 'error', items: [], error: error.message });
        }
      },
    )
    .finally(() => {
      // A load a newer one replaced must not clear the newer one's promise.
      if (pending === controller) {
        inFlight = undefined;
      }
    });

  return inFlight;
}

/**
 * Refetches one application after a lifecycle command or server event, leaving the rest of the
 * list untouched. A no-op until the list is cached — a first load fetches fresh state anyway.
 */
export async function refreshApplication(key: string): Promise<void> {
  if ($applications.get().status !== 'ready') {
    return Promise.resolve();
  }

  refreshing.get(key)?.abort();
  const controller = new AbortController();
  refreshing.set(key, controller);
  const { signal } = controller;

  return fetchApplication(key, signal)
    .match(
      (application) => {
        if (signal.aborted) {
          return;
        }
        if (application == null) {
          removeApplication(key);
        } else {
          upsertApplication(application);
        }
      },
      () => {
        // The list still shows valid, if stale, state — the next event or Refresh resyncs it.
        // Flipping the whole list to `error` over one background refetch would be worse.
      },
    )
    .finally(() => {
      if (refreshing.get(key) === controller) {
        refreshing.delete(key);
      }
    });
}

/** Drops an uninstalled application from the cached list without asking the server. */
export function removeApplication(key: string): void {
  const { items } = $applications.get();
  const remaining = items.filter((application) => application.key !== key);
  if (remaining.length !== items.length) {
    $applications.setKey('items', remaining);
  }
}

// *
// * Initialization
// *

onMount($applications, () => {
  if ($applications.get().status !== 'ready' && inFlight == null) {
    void refreshApplications();
  }
});

// *
// * Internal
// *

function upsertApplication(application: Application): void {
  const { items } = $applications.get();
  const next = [...items.filter(({ key }) => key !== application.key), application].sort(
    byDisplayName,
  );
  $applications.setKey('items', next);
}

function byDisplayName(a: Application, b: Application): number {
  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
}
