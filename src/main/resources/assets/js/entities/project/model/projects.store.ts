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

export function receiveProjects(result: Result<Project[], AppError>): void {
  result.match(
    (items) => $projects.set({ status: 'ready', items }),
    (error) => $projects.set({ status: 'error', items: [], error: error.message }),
  );
}
