import {
  addMembers,
  createRole as createRolePrincipal,
  findPrincipals,
  getMembers,
  getPrincipal,
  modifyRole,
  removeMembers,
  type GroupKey,
  type Principal,
  type Role,
  type RoleKey,
  type UserKey,
} from '/lib/xp/auth';

import { byName, displayNameOf, toPrincipalItem, type PrincipalItem } from './principal.source';

export type RoleSource = Role;

/** A role as the dialog holds it: scalars plus the whole member list, never a delta. */
export type RoleInput = {
  displayName: string;
  description?: string;
  members: readonly string[];
};

export function listRoles(): Role[] {
  // ? count: -1 is NodeSearchService.GET_ALL_SIZE_FLAG, honoured in SearchExecutor:50 — not
  // ? PrincipalQuery's same-valued constant, which is private. findPrincipals defaults to 10, so
  // ? without it the list truncates on any install carrying more roles, with nothing to show for it.
  const { hits } = findPrincipals({ type: 'role', count: -1 });

  return hits.filter(isRole).sort((a, b) => byName(displayNameOf(a), displayNameOf(b)));
}

/** A superset of what XP accepts — see the `catch` in `getRole` for why it cannot be the whole check. */
const ROLE_KEY = /^role:[^:]+$/;

/**
 * Null for a key no role answers to, which is a legitimate answer rather than a failure.
 *
 * Three guards, the same set `getUser` needs and for the same reasons:
 *
 * ! The pattern and the type check keep the field honest about *what* it answers for. `getPrincipal`
 * ! answers for whatever a key names, so without them `group:system:editors` would come back as a
 * ! group and have its members served as a role's.
 *
 * ! The `catch` keeps it honest about *failing*. The pattern is only a superset of what XP accepts:
 * ! `PrincipalKey.ofRole` validates the id through `ID_VALIDATOR`, which rejects spaces and HTML
 * ! specials among others, and **throws** rather than returning nothing. Replicating that charset here
 * ! would be a second copy to keep in step, so the throw is caught instead — a key the platform will
 * ! not parse names no role, which is exactly what null says.
 */
export function getRole(key: string): Role | null {
  if (!ROLE_KEY.test(key)) {
    return null;
  }

  try {
    const principal = getPrincipal(key as RoleKey);
    return principal != null && principal.type === 'role' ? principal : null;
  } catch {
    return null;
  }
}

export function listRoleMembers(key: RoleKey): PrincipalItem[] {
  return getMembers(key)
    .map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}

export function createRole(name: string, input: RoleInput): Role {
  const role = createRolePrincipal({
    name,
    displayName: input.displayName,
    description: input.description,
  });

  syncMembers(role.key, input.members);

  return role;
}

export function updateRole(key: string, input: RoleInput): Role {
  const role = modifyRole({
    key: key as RoleKey,
    // ! The empty string is what clears a description, and `undefined` would not: `ModifyRoleHandler`
    // ! assigns a field only when the editor returned a non-null value, so an omitted one reads as
    // ! "leave it alone" and a cleared description would silently survive the save.
    editor: (current) => ({
      ...current,
      displayName: input.displayName,
      description: input.description ?? '',
    }),
  });

  if (role == null) {
    throw new Error(`No role answers to [${key}]`);
  }

  syncMembers(role.key, input.members);

  return role;
}

// *
// * Helpers
// *

const ADMIN_ROLE = 'role:system.admin';
const SUPER_USER = 'user:system:su';

/**
 * ! The client sends what it displays, so the difference is worked out here against what the platform
 * ! actually holds. A caller sending an empty list means the role is to hold nobody — which is why the
 * ! schema takes the list non-null: an argument that went missing would read as exactly that.
 */
function syncMembers(key: RoleKey, members: readonly string[]): void {
  const current = getMembers(key).map((member) => member.key);
  const added = members.filter((member) => !current.includes(member as UserKey | GroupKey));
  const removed = current.filter((member) => !members.includes(member));

  // ! Losing `su` from Administrators locks the last way back into the tool. app-users refuses the same
  // ! edit, and the platform does not.
  if (key === ADMIN_ROLE && removed.includes(SUPER_USER)) {
    throw new Error(`Cannot remove [${SUPER_USER}] from [${ADMIN_ROLE}]`);
  }

  if (added.length > 0) {
    addMembers(key, added as (UserKey | GroupKey)[]);
  }
  if (removed.length > 0) {
    removeMembers(key, removed);
  }
}

function isRole(principal: Principal): principal is Role {
  return principal.type === 'role';
}
