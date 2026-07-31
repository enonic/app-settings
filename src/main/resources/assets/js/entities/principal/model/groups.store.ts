import { map } from 'nanostores';

import { fetchGroups } from '../api/groups.api';
import type { Group } from './principal.types';

export type GroupsState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly Group[];
  error?: string;
};

export const $groups = map<GroupsState>({ status: 'loading', items: [] });

// ! Refresh and search can retrigger a load, so the previous one is cancelled and its answer
// ! dropped: without this the slower of two requests decides what the list shows.
let pending: AbortController | undefined;

export function loadGroups(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  $groups.setKey('status', 'loading');

  return fetchGroups(signal).match(
    (items) => {
      if (!signal.aborted) {
        $groups.set({ status: 'ready', items });
      }
    },
    (error) => {
      if (!signal.aborted) {
        $groups.set({ status: 'error', items: [], error: error.message });
      }
    },
  );
}
