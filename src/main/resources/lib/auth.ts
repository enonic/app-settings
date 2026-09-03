import { hasRole } from '/lib/xp/auth';

export const ADMIN_ROLE = 'role:system.admin';

export function isAdmin(): boolean {
  return hasRole(ADMIN_ROLE);
}
