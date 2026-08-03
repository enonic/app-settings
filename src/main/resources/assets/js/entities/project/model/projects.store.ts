import { map } from 'nanostores';
import type { Result } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import type { Project } from './project.types';

export type ProjectsState = {
  status: 'loading' | 'ready' | 'error';
  items: readonly Project[];
  error?: string;
};

export const $projects = map<ProjectsState>({ status: 'loading', items: [] });

/**
 * The store holds the projects and nothing else — no request, no cancelling.
 *
 * Nothing reads projects on their own: the Roles filter is the only reader and it needs them beside the
 * roles, so they travel in that screen's document and arrive here through `receiveProjects`.
 */
export function beginProjectsLoad(): void {
  $projects.setKey('status', 'loading');
}

/**
 * ! Keeps the projects it has when a read fails, for the reason `receiveIdProviders` gives: this list only
 * ! names things — the Roles filter labels its project buckets from it — so dropping it on a failed refresh
 * ! turns labels into raw ids for no gain. The failure is reported and the screen says so in a notice.
 */
export function receiveProjects(result: Result<Project[], AppError>): void {
  result.match(
    (items) => $projects.set({ status: 'ready', items }),
    (error) => $projects.set({ ...$projects.get(), status: 'error', error: error.message }),
  );
}
