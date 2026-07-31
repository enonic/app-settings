import { map } from 'nanostores';

import { fetchIdProviders } from '../api/id-providers.api';
import type { IdProvider } from './principal.types';

export type IdProvidersState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly IdProvider[];
  error?: string;
};

export const $idProviders = map<IdProvidersState>({ status: 'loading', items: [] });

// ! Refresh and search can retrigger a load, so the previous one is cancelled and its answer
// ! dropped: without this the slower of two requests decides what the list shows.
let pending: AbortController | undefined;

export function loadIdProviders(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  $idProviders.setKey('status', 'loading');

  return fetchIdProviders(signal).match(
    (items) => {
      if (!signal.aborted) {
        $idProviders.set({ status: 'ready', items });
      }
    },
    (error) => {
      if (!signal.aborted) {
        $idProviders.set({ status: 'error', items: [], error: error.message });
      }
    },
  );
}
