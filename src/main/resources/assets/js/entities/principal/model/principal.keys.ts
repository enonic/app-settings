import type { PrincipalKey } from './principal.types';

const SYSTEM_ROLE_PREFIX = 'role:system.';
const PROJECT_ROLE_PREFIX = 'role:cms.project.';

/** Roles the platform owns: created by XP or by a project, and never deletable. */
export function isSystemRole(key: PrincipalKey): boolean {
  return key.startsWith(SYSTEM_ROLE_PREFIX) || key.startsWith(PROJECT_ROLE_PREFIX);
}

// The two users the platform owns and lib-admin-ui's `isSystem()` refuses to delete.
const SYSTEM_USER_KEYS = ['user:system:su', 'user:system:anonymous'];

/** Users the platform owns: `su` and `anonymous`, which may not be deleted. */
export function isSystemUser(key: PrincipalKey): boolean {
  return SYSTEM_USER_KEYS.includes(key);
}

/**
 * The principal's own name, which is what its key ends with: `alice`, `administrators`,
 * `cms.admin`. This is the string the real data carries and the one shown under a display name;
 * the provider it belongs to is provenance and goes in a meta cell instead.
 */
export function principalName(key: PrincipalKey): string {
  return key.slice(key.lastIndexOf(':') + 1);
}

/**
 * Provenance, read off the key: `user:system:su` and `group:system:administrators` both belong to
 * the `system` provider. A role belongs to none.
 */
export function idProviderOf(key: PrincipalKey): string | undefined {
  const [type, provider] = key.split(':');
  return type === 'role' ? undefined : provider;
}
