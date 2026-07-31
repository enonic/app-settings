import { useStore } from '@nanostores/preact';

import type { Role } from './principal.types';
import { $roles } from './roles.store';

/**
 * Reads what is already loaded — the section page owns the loading. The key is a plain string
 * because it arrives from the route: it is a `PrincipalKey` only once a role answers to it.
 */
export function useRole(key: string | undefined): Role | undefined {
  const { items } = useStore($roles);

  if (key === undefined) {
    return undefined;
  }

  return items.find((role) => role.key === key);
}
