import { err, ok, type Result } from 'neverthrow';

import {
  beginGroupsLoad,
  beginIdProvidersLoad,
  receiveGroups,
  receiveIdProviders,
  toGroups,
  toIdProviders,
} from '../../../entities/principal';
import { AppError } from '../../../shared/api';
import { fetchGroupsScreen, type GroupsScreenData } from '../api/groups-screen.api';

/**
 * Loads the Groups screen and fans the one answer out into the two stores that own its parts.
 *
 * ! Refresh can retrigger this, so the previous load is cancelled and its answer dropped: without it the
 * ! slower of two requests decides what the list shows.
 */
let pending: AbortController | undefined;

export function loadGroupsScreen(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  beginGroupsLoad();
  beginIdProvidersLoad();

  return fetchGroupsScreen(signal).match(
    (answer) => {
      if (!signal.aborted) {
        dispatch(answer.data, answer.message);
      }
    },
    (error) => {
      if (!signal.aborted) {
        const failed = err(error);
        receiveGroups(failed);
        receiveIdProviders(failed);
      }
    },
  );
}

//
// * Helpers
//

// Each root field fails on its own, so each domain gets its own verdict. The message is shared because
// lib-graphql sends no `path`, and reaches only the domains that came back null.
function dispatch(data: GroupsScreenData, message: string | undefined): void {
  receiveGroups(present(data.groups, message).map(toGroups));
  receiveIdProviders(present(data.idProviders, message).map(toIdProviders));
}

function present<T>(value: T[] | null, message: string | undefined): Result<T[], AppError> {
  return value == null ? err(new AppError(message ?? 'The field could not be read')) : ok(value);
}
