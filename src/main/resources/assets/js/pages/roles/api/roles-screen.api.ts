import type { ResultAsync } from 'neverthrow';

import {
  ID_PROVIDERS_ROOT,
  ROLES_ROOT,
  type IdProvidersData,
  type RolesData,
} from '../../../entities/principal';
import { PROJECTS_ROOT, type ProjectsData } from '../../../entities/project';
import { requestGraphQlRoots, type AppError, type GraphQlRootsAnswer } from '../../../shared/api';

/**
 * Everything the Roles screen reads, in one request.
 *
 * Three domains meet here and nowhere below: the roles themselves, the id providers that name where a
 * member comes from, and the projects that name a role's bucket in the filter. Entity slices may not
 * import each other, so this is the lowest layer where the three can be asked for together — and asking
 * together is what makes the screen one round trip instead of three on an engine that serves this app
 * one request at a time.
 *
 * Only the composition lives here. Every selection and every wire shape stays in the api file of the
 * domain that owns it; this file names no field of its own.
 */
export type RolesScreenData = RolesData & IdProvidersData & ProjectsData;

export function fetchRolesScreen(
  signal?: AbortSignal,
): ResultAsync<GraphQlRootsAnswer<RolesScreenData>, AppError> {
  return requestGraphQlRoots<RolesScreenData>(
    [ROLES_ROOT, ID_PROVIDERS_ROOT, PROJECTS_ROOT],
    'RolesScreen',
    signal,
  );
}
