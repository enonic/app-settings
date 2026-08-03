import { useStore } from '@nanostores/preact';

import { $projects, type ProjectsState } from './projects.store';

/** A read. Nothing loads projects on their own — the Roles screen asks for them beside its roles. */
export function useProjects(): ProjectsState {
  return useStore($projects);
}
