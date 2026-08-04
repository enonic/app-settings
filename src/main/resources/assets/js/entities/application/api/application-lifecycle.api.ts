import { errAsync, type ResultAsync } from 'neverthrow';

import { AppError, requestJson } from '../../../shared/api';
import { $config } from '../../../shared/config';

// The wire shape of XP core's `server:app` start/stop endpoints (ApplicationApiHandler):
// one POST per action for any number of keys, answered with a per-key outcome.
type LifecycleResultDto = {
  results: { id: string; success: boolean }[];
};

export type LifecycleOutcome = {
  failedKeys: string[];
};

/** Starts the given applications through XP's `server:app` api. */
export function postStartApplications(
  keys: readonly string[],
): ResultAsync<LifecycleOutcome, AppError> {
  return postLifecycleAction($config.get()?.apis.serverApp.start, keys);
}

/** Stops the given applications through XP's `server:app` api. */
export function postStopApplications(
  keys: readonly string[],
): ResultAsync<LifecycleOutcome, AppError> {
  return postLifecycleAction($config.get()?.apis.serverApp.stop, keys);
}

// *
// * Internal
// *

function postLifecycleAction(
  url: string | undefined,
  keys: readonly string[],
): ResultAsync<LifecycleOutcome, AppError> {
  if (url == null) {
    return errAsync(new AppError('Tool config read before the app finished starting'));
  }

  return requestJson<LifecycleResultDto>(url, { method: 'POST', body: { key: keys } }).map(
    ({ results }) => ({
      failedKeys: results.filter(({ success }) => !success).map(({ id }) => id),
    }),
  );
}
