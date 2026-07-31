import { map } from 'nanostores';

import { fetchUsers } from '../api/users.api';
import type { User } from './principal.types';

export type UsersState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly User[];
  error?: string;
};

export const $users = map<UsersState>({ status: 'loading', items: [] });

// ! Refresh and search can retrigger a load, so the previous one is cancelled and its answer
// ! dropped: without this the slower of two requests decides what the list shows.
let pending: AbortController | undefined;

export function loadUsers(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  $users.setKey('status', 'loading');

  return fetchUsers(signal).match(
    (items) => {
      if (!signal.aborted) {
        $users.set({ status: 'ready', items });
      }
    },
    (error) => {
      if (!signal.aborted) {
        $users.set({ status: 'error', items: [], error: error.message });
      }
    },
  );
}
