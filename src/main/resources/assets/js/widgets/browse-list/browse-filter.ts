export type BrowseFilterEntry = {
  id: string;
  label: string;
  count: number;
};

/**
 * Drops the entries a search left empty, so the filter offers only what it can actually narrow to.
 *
 * A ticked entry stays whatever its count, and that exception is the whole reason this is not a
 * plain `count > 0`: a search can empty the entry a user has ticked, and hiding it then would leave
 * the list narrowed by something invisible and impossible to untick.
 */
export function visibleEntries(
  entries: readonly BrowseFilterEntry[],
  selected: ReadonlySet<string>,
): BrowseFilterEntry[] {
  return entries.filter(({ id, count }) => count > 0 || selected.has(id));
}
