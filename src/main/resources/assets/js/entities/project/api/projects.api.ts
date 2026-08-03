import type { GraphQlRoot } from '../../../shared/api';
import type { Project } from '../model/project.types';

const PROJECTS_SELECTION = `{
  id
  displayName
}`;

/**
 * The root field and selection for the project list.
 *
 * There is no `fetchProjects`: nothing needs projects on their own. The Roles filter is the only reader,
 * and it needs them beside the roles, so they travel in that screen's document.
 */
export const PROJECTS_ROOT: GraphQlRoot = { field: 'projects', selection: PROJECTS_SELECTION };

/** The wire shape happens to be the domain shape here — id and display name, nothing else. */
export type ProjectsData = { projects: Project[] | null };
