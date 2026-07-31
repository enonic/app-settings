import type { Principal, Role as XpRole } from '@enonic-types/core';

/**
 * The principal shapes come from the platform's own types, so nothing here can drift from what
 * `lib/xp/auth` returns: `PrincipalKey` is the template-literal union `user:` / `group:` / `role:`,
 * and `Principal` discriminates on `type`.
 */
export type {
  Group,
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
