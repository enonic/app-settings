import { useStore } from '@nanostores/preact';

import type { User } from './principal.types';
import { $users } from './users.store';

/**
 * Reads what is already loaded — the section page owns the loading. The key is a plain string
 * because it arrives from the route: it is a `PrincipalKey` only once a user answers to it.
 */
export function useUser(key: string | undefined): User | undefined {
  const { items } = useStore($users);

  if (key === undefined) {
    return undefined;
  }

  return items.find((user) => user.key === key);
}
