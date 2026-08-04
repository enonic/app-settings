import type { Application } from '../../../entities/application';

/**
 * Display name, description and key, case-insensitive, over the applications already loaded. The key
 * is searched here where the other sections leave it out: `com.enonic.app.booster` does not echo the
 * display name, and it is what an admin knows an application by.
 */
export function filterApplications(
  applications: readonly Application[],
  query: string,
): Application[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...applications];
  }

  return applications.filter(({ displayName, description, key }) =>
    [displayName, description, key].some((field) => field?.toLowerCase().includes(needle) ?? false),
  );
}
