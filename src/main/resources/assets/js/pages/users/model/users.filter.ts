import type { User } from '../../../entities/principal';

/**
 * Display name, user name and email, case-insensitive, over the users already loaded. A user is
 * looked for by any of the three, which is what the search box is for; the key stays out, as it
 * does in the other sections.
 */
export function filterUsers(users: readonly User[], query: string): User[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...users];
  }

  return users.filter(({ displayName, login, email }) =>
    [displayName, login, email].some((field) => field?.toLowerCase().includes(needle) ?? false),
  );
}
