import {
  findPrincipals,
  getMembers,
  getMemberships,
  type Group,
  type GroupKey,
  type Principal,
} from '/lib/xp/auth';

import { byName, displayNameOf, toPrincipalItem, type PrincipalItem } from './principal.source';

export type GroupSource = Group;

export function listGroups(): Group[] {
  // ? count: -1 is NodeSearchService.GET_ALL_SIZE_FLAG, honoured in SearchExecutor:50 — not
  // ? PrincipalQuery's same-valued constant, which is private. findPrincipals defaults to 10, so
  // ? without it the list truncates on any install carrying more groups, with nothing to show for it.
  const { hits } = findPrincipals({ type: 'group', count: -1 });

  return hits.filter(isGroup).sort((a, b) => byName(displayNameOf(a), displayNameOf(b)));
}

export function listGroupMembers(key: GroupKey): PrincipalItem[] {
  return getMembers(key)
    .map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}

/**
 * The roles the group holds.
 *
 * `getMemberships` answers with roles *and* the groups this group sits in; only the roles are kept,
 * because no screen shows a group's parent groups — the members list is flat by contract, and a
 * group inside a group is a row there rather than a branch.
 */
export function listGroupRoles(key: GroupKey): PrincipalItem[] {
  return getMemberships(key)
    .filter(({ type }) => type === 'role')
    .map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}

// *
// * Helpers
// *

function isGroup(principal: Principal): principal is Group {
  return principal.type === 'group';
}
