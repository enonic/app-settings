import { useStore } from '@nanostores/preact';

import { $groups } from './groups.store';
import type { Group } from './principal.types';

/**
 * Reads what is already loaded — the section page owns the loading. The key is a plain string
 * because it arrives from the route: it is a `PrincipalKey` only once a group answers to it.
 */
export function useGroup(key: string | undefined): Group | undefined {
  const { items } = useStore($groups);

  if (key === undefined) {
    return undefined;
  }

  return items.find((group) => group.key === key);
}
