import type { Group } from '../../../entities/principal';

/**
 * Display name and description, case-insensitive, over the groups already loaded — the same
 * fields the Roles section matches on. Filtering by ID provider gets the header's `filter` slot
 * when it is designed; the key stays out of the search for the same reason as there.
 */
export function filterGroups(groups: readonly Group[], query: string): Group[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...groups];
  }

  return groups.filter(
    ({ displayName, description }) =>
      displayName.toLowerCase().includes(needle) ||
      (description?.toLowerCase().includes(needle) ?? false),
  );
}
