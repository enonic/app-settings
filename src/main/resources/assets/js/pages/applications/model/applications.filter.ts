import type { Application } from '../../../entities/application';
import type { BrowseFilterEntry } from '../../../widgets/browse-list/browse-filter';

/**
 * Display name, description and key, case-insensitive, over the applications already loaded. The key
 * is searched here where the other sections leave it out: `com.enonic.app.booster` does not echo the
 * display name, and it is what an admin knows an application by.
 */
export function searchApplications(
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

export const SYSTEM_ENTRY = 'system';

/**
 * The one entry this section offers, and it is an include toggle rather than a bucket.
 *
 * ! Inverted against every other section's filter, where nothing ticked narrows nothing: the
 * ! applications XP itself ships are noise for an admin managing their own, so they start hidden and
 * ! ticking reveals them — app-applications hid them behind the same toggle, off by default.
 */
export function filterApplicationsBySystem(
  applications: readonly Application[],
  selected: ReadonlySet<string>,
): Application[] {
  if (selected.has(SYSTEM_ENTRY)) {
    return [...applications];
  }

  return applications.filter(({ system }) => !system);
}

/**
 * The entry, counted over the searched applications: how many ticking would reveal.
 *
 * ! Offered whatever that count, so it never passes through `visibleEntries`. Hiding it at zero is
 * ! what the inverted reading cannot afford — an absent entry would go on hiding rows with no control
 * ! left on screen to reveal them — and an entry appearing and vanishing as the user types is worse
 * ! than one reading zero.
 */
export function systemEntry(matched: readonly Application[], label: string): BrowseFilterEntry {
  return {
    id: SYSTEM_ENTRY,
    label,
    count: matched.filter(({ system }) => system).length,
  };
}
