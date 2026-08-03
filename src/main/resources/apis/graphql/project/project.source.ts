import { list, type Project } from '/lib/xp/project';

export type ProjectSource = Project;

export function displayNameOf(project: Project): string {
  return nonEmpty(project.displayName) ?? project.id;
}

// ? Layers are projects too — `list()` returns them alongside, each with its own five roles — so
// ? they land in the same list rather than a separate one.
export function listProjects(): Project[] {
  return list().sort((a, b) =>
    displayNameOf(a).localeCompare(displayNameOf(b), undefined, { sensitivity: 'base' }),
  );
}

// *
// * Helpers
// *

// ! Keep the null check. lib-project's ProjectMapper writes the display name from a nullable Java
// ! getter, and the bridge drops the key rather than sending null.
function nonEmpty(value?: string): string | undefined {
  return value != null && value.length > 0 ? value : undefined;
}
