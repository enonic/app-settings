import type {
  Group as XpGroup,
  Principal,
  Role as XpRole,
  User as XpUser,
} from '@enonic-types/core';
import type { IdProvider as XpIdProvider } from '@enonic-types/lib-auth';

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
  roles: readonly Principal[];
};

/**
 * A user with the roles and groups it belongs to, which the platform returns from
 * `getMemberships`.
 *
 * `description` and `createdTime` are **not** in `lib/xp/auth`'s user: the mockups show a
 * description under the display name and a created/modified pair in the details, and both will have
 * to come from the node behind the principal. Until #8 they come from fixtures, and they stay
 * optional so a section renders without them.
 */
export type User = XpUser & {
  description?: string;
  createdTime?: string;
  roles: readonly Principal[];
  groups: readonly Principal[];
};

/**
 * An ID provider with the principals that belong to it — users and groups, the two kinds a
 * provider holds; roles have no provider at all. The platform's own type comes from
 * `@enonic-types/lib-auth`, because `getIdProviders` is what returns it; `idProviderConfig` is
 * absent while a provider is bound to no application, and such a provider serves no login.
 *
 * There is no `Active` / `Inactive` flag: the platform has none, and which reading it should take is
 * still open — see § 5 of `docs/browse-framework.md`.
 */
export type IdProvider = XpIdProvider & {
  users: readonly Principal[];
  groups: readonly Principal[];
  /**
   * The roles held by this provider's principals. A role belongs to no provider — `role:<id>` has
   * no provider segment — so this is an aggregate over the memberships of the users and groups
   * above, and the backend is where it gets computed once there is one.
   */
  roles: readonly Principal[];
};
