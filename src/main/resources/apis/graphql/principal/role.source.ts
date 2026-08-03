import { findPrincipals, getMembers, type Principal, type Role, type RoleKey } from '/lib/xp/auth';

import { byName, displayNameOf, toPrincipalItem, type PrincipalItem } from './principal.source';

export type RoleSource = Role;

export function listRoles(): Role[] {
  // ? count: -1 is NodeSearchService.GET_ALL_SIZE_FLAG, honoured in SearchExecutor:50 — not
  // ? PrincipalQuery's same-valued constant, which is private. findPrincipals defaults to 10, so
  // ? without it the list truncates on any install carrying more roles, with nothing to show for it.
  const { hits } = findPrincipals({ type: 'role', count: -1 });

  return hits.filter(isRole).sort((a, b) => byName(displayNameOf(a), displayNameOf(b)));
}

export function listRoleMembers(key: RoleKey): PrincipalItem[] {
  return getMembers(key)
    .map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}

// *
// * Helpers
// *

function isRole(principal: Principal): principal is Role {
  return principal.type === 'role';
}
