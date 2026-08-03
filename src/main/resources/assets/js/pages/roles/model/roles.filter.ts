import {
  isPlatformRole,
  principalName,
  projectRoleIdOf,
  type PrincipalKey,
  type Role,
} from '../../../entities/principal';
import type { Project } from '../../../entities/project';
import type { BrowseFilterEntry } from '../../../widgets/browse-list/browse-filter';

export const SYSTEM_BUCKET = 'system';
export const CUSTOM_BUCKET = 'custom';

/** A bucket id: the two fixed ones, or `project:<id>` for one project or layer. */
export type RoleBucketId = string;

/** Resolved label: a phrase for the fixed buckets, the project display name otherwise. */
export type RoleBucket = BrowseFilterEntry;

export function projectBucketId(projectId: string): RoleBucketId {
  return `project:${projectId}`;
}

/**
 * Which bucket a role belongs to, read off the key alone. What a key means is the domain's business;
 * grouping those answers into the entries a filter offers is this page's.
 *
 * ! Deliberately independent of which projects are loaded. Deciding this against the project list made
 * ! the narrowing itself depend on a second request: when that list came back empty — a failed refresh
 * ! is enough — every project role silently reclassified as custom, so a ticked project bucket matched
 * ! nothing while its entry vanished from the menu, leaving an empty list narrowed by something there
 * ! was no longer any way to untick. A role of a project that no longer exists therefore keeps its own
 * ! bucket, labelled by the id, rather than being folded into custom.
 */
export function bucketOf(key: PrincipalKey): RoleBucketId {
  const projectId = projectRoleIdOf(key);
  if (projectId !== undefined) {
    return projectBucketId(projectId);
  }

  return isPlatformRole(key) ? SYSTEM_BUCKET : CUSTOM_BUCKET;
}

/**
 * Display name, description and the name read off the key, case-insensitive.
 *
 * The key is matched because the row shows it as its subtitle: a project role reads
 * `cms.project.intranet.editor` there while its display name is `Company intranet - Editor`, so the
 * project id is on screen and typing it has to find something.
 */
export function searchRoles(roles: readonly Role[], query: string): Role[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...roles];
  }

  return roles.filter(
    ({ key, displayName, description }) =>
      displayName.toLowerCase().includes(needle) ||
      principalName(key).toLowerCase().includes(needle) ||
      (description?.toLowerCase().includes(needle) ?? false),
  );
}

/** No bucket selected narrows nothing, the reading every multi-select filter takes. */
export function filterRolesByBucket(
  roles: readonly Role[],
  selected: ReadonlySet<RoleBucketId>,
): Role[] {
  if (selected.size === 0) {
    return [...roles];
  }

  return roles.filter((role) => selected.has(bucketOf(role.key)));
}

/**
 * The entries the filter offers: system first, custom second, then one per project by label.
 *
 * ! Which entries exist comes from every role, plus every loaded project so an empty one is still
 * ! offered; only the counts come from `matched`. A project bucket therefore survives both a search that
 * ! excludes it and a projects list that failed to load — in the second case labelled by its id, since
 * ! the roles themselves still name it. Taking the entries from the search or from the project list alone
 * ! is what let a ticked bucket disappear while it went on narrowing.
 */
export function roleBuckets(
  roles: readonly Role[],
  matched: readonly Role[],
  projects: readonly Project[],
  labels: { system: string; custom: string },
): RoleBucket[] {
  const counts = new Map<RoleBucketId, number>();
  for (const { key } of matched) {
    const id = bucketOf(key);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const projectLabels = new Map<string, string>();
  for (const { key } of roles) {
    const projectId = projectRoleIdOf(key);
    if (projectId !== undefined) {
      projectLabels.set(projectId, projectId);
    }
  }
  // The display name wins wherever the project list carries one, and adds the projects that own no role.
  for (const { id, displayName } of projects) {
    projectLabels.set(id, displayName);
  }

  const projectBuckets = [...projectLabels]
    .map(([id, label]) => ({
      id: projectBucketId(id),
      label,
      count: counts.get(projectBucketId(id)) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

  return [
    { id: SYSTEM_BUCKET, label: labels.system, count: counts.get(SYSTEM_BUCKET) ?? 0 },
    { id: CUSTOM_BUCKET, label: labels.custom, count: counts.get(CUSTOM_BUCKET) ?? 0 },
    ...projectBuckets,
  ];
}
