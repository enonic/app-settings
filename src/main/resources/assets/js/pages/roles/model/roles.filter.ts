import type { Role } from '../../../entities/principal';

/**
 * Display name and description, case-insensitive, over the roles already loaded.
 * The role key is deliberately not searched: it repeats the display name closely enough
 * that matching it only widens the result set.
 */
export function filterRoles(roles: readonly Role[], query: string): Role[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...roles];
  }

  return roles.filter(
    ({ displayName, description }) =>
      displayName.toLowerCase().includes(needle) ||
      (description?.toLowerCase().includes(needle) ?? false),
  );
}
