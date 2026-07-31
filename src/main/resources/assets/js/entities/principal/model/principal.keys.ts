import type { PrincipalKey } from './principal.types';

const SYSTEM_ROLE_PREFIX = 'role:system.';
const PROJECT_ROLE_PREFIX = 'role:cms.project.';

/** Roles the platform owns: created by XP or by a project, and never deletable. */
export function isSystemRole(key: PrincipalKey): boolean {
  return key.startsWith(SYSTEM_ROLE_PREFIX) || key.startsWith(PROJECT_ROLE_PREFIX);
}

/** The key as a path, which is how it is shown under a display name: `/role/system.admin`. */
export function toPrincipalPath(key: PrincipalKey): string {
  return `/${key.split(':').join('/')}`;
}

/**
 * Provenance, read off the key: `user:system:su` and `group:system:administrators` both belong to
 * the `system` provider. A role belongs to none.
 */
export function idProviderOf(key: PrincipalKey): string | undefined {
  const [type, provider] = key.split(':');
  return type === 'role' ? undefined : provider;
}
