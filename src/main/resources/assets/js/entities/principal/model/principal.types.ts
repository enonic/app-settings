import type { Group as XpGroup, Principal, Role as XpRole } from '@enonic-types/core';

/**
 * The principal shapes come from the platform's own types, so nothing here can drift from what
 * `lib/xp/auth` returns: `PrincipalKey` is the template-literal union `user:` / `group:` / `role:`,
 * and `Principal` discriminates on `type`.
 */
export type {
  GroupKey,
  Principal,
  PrincipalKey,
  PrincipalType,
  RoleKey,
  User,
  UserKey,
} from '@enonic-types/core';

/** A role with its member list, which the platform exposes separately through `getMembers`. */
export type Role = XpRole & {
  members: readonly Principal[];
};

/**
 * A group with its members and the roles it holds. Both are separate calls in the platform —
 * `getMembers` and `getMemberships` — and a member that is itself a group appears here as the
 * platform's plain `Principal`, without members of its own: the UI shows no nesting.
 */
export type Group = XpGroup & {
  members: readonly Principal[];
  roles: readonly XpRole[];
};
