import { err, ok, type Result } from 'neverthrow';

import {
  beginIdProviderNamesLoad,
  beginRolesLoad,
  receiveIdProviderNames,
  receiveRoles,
  toIdProviderNames,
  toRoles,
} from '../../../entities/principal';
import { beginProjectsLoad, receiveProjects } from '../../../entities/project';
import { AppError } from '../../../shared/api';
import { fetchRolesScreen, type RolesScreenData } from '../api/roles-screen.api';

/**
 * Loads the Roles screen and fans the one answer out into the three stores that own its parts.
 *
 * ! Refresh can retrigger this, so the previous load is cancelled and its answer dropped: without it the
 * ! slower of two requests decides what the list shows. Cancelling once here is why the stores hold no
 * ! request of their own.
 */
let pending: AbortController | undefined;

export function loadRolesScreen(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  beginRolesLoad();
  beginIdProviderNamesLoad();
  beginProjectsLoad();

  return fetchRolesScreen(signal).match(
    (answer) => {
      if (!signal.aborted) {
        dispatch(answer.data, answer.message);
      }
    },
    (error) => {
      if (!signal.aborted) {
        const failed = err(error);
        receiveRoles(failed);
        receiveIdProviderNames(failed);
        receiveProjects(failed);
      }
    },
  );
}

//
// * Helpers
//

/**
 * Each domain gets its own verdict, because each root field fails on its own — every one of them is
 * nullable for exactly that reason, and `schema/query.ts` explains it. A failed `projects` therefore
 * leaves the role list intact and only turns the filter's project entries into a notice.
 *
 * The message is shared: lib-graphql sends no `path`, so which error belongs to which field is not
 * knowable from the response. It reaches only the domains that actually came back null.
 */
function dispatch(data: RolesScreenData, message: string | undefined): void {
  receiveRoles(present(data.roles, message).map(toRoles));
  receiveIdProviderNames(present(data.idProviders, message).map(toIdProviderNames));
  receiveProjects(present(data.projects, message));
}

function present<T>(value: T[] | null, message: string | undefined): Result<T[], AppError> {
  return value == null ? err(new AppError(message ?? 'The field could not be read')) : ok(value);
}
