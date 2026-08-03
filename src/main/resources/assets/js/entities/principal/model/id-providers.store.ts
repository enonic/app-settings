import { computed, map, type ReadableAtom } from 'nanostores';
import { err, ok, type Result } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import { fetchIdProviders } from '../api/id-providers.api';
import type { IdProvider } from './principal.types';

export type IdProvidersState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly IdProvider[];
  error?: string;
};

export const $idProviders = map<IdProvidersState>({ status: 'loading', items: [] });

/**
 * Provider name to display name, for the sections that show where a principal comes from.
 *
 * A principal key carries its provider's *name* (`group:ldap:developers`), and every screen wants
 * the name an administrator recognises. The providers are few and already loaded as their own
 * section, so the lookup is a projection rather than a request — nothing here asks the server for
 * something it can read off a key plus this list.
 */
export const $idProviderNames: ReadableAtom<ReadonlyMap<string, string>> = computed(
  $idProviders,
  ({ items }) => new Map(items.map(({ key, displayName }) => [key, displayName])),
);

export function beginIdProvidersLoad(): void {
  $idProviders.setKey('status', 'loading');
}

/**
 * ! Keeps the providers it has when a read fails, unlike a section's own list store.
 *
 * ! This list is a reference the other sections name principals by: Groups and Users show it in a filter
 * ! and in every row's provenance cell. Dropping it on a failed refresh emptied the filter menu while a
 * ! ticked provider went on narrowing the query — a narrowing with no entry left to untick. The failure is
 * ! still reported, so a screen can say the list may be short; what it must not do is silently shrink.
 */
export function receiveIdProviders(result: Result<IdProvider[], AppError>): void {
  result.match(
    (items) => $idProviders.set({ status: 'ready', items }),
    (error) => $idProviders.set({ ...$idProviders.get(), status: 'error', error: error.message }),
  );
}

/**
 * The providers on their own, for the section that shows them and needs nothing else.
 *
 * Groups and Roles do not use this: they need the providers beside their own domain, so those screens
 * ask for both in one document and hand the outcome to `receiveIdProviders`.
 *
 * ! Refresh can retrigger the load, so the previous one is cancelled and its answer dropped: without
 * ! this the slower of two requests decides what the list shows.
 */
let pending: AbortController | undefined;

export function loadIdProviders(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  beginIdProvidersLoad();

  return fetchIdProviders(signal).match(
    (items) => {
      if (!signal.aborted) {
        receiveIdProviders(ok(items));
      }
    },
    (error) => {
      if (!signal.aborted) {
        receiveIdProviders(err(error));
      }
    },
  );
}
