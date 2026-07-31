import { map } from 'nanostores';

import { fetchRoles } from '../api/roles.api';
import type { Role } from './principal.types';

export type RolesState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly Role[];
  error?: string;
};

export const $roles = map<RolesState>({ status: 'loading', items: [] });

// ! Refresh and search can retrigger a load, so the previous one is cancelled and its answer
// ! dropped: without this the slower of two requests decides what the list shows.
let pending: AbortController | undefined;

export function loadRoles(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  $roles.setKey('status', 'loading');

  return fetchRoles(signal).match(
    (items) => {
      if (!signal.aborted) {
        $roles.set({ status: 'ready', items });
      }
    },
    (error) => {
      if (!signal.aborted) {
        $roles.set({ status: 'error', items: [], error: error.message });
      }
    },
  );
}
