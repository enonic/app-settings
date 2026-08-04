import type { ResultAsync } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import { $phrases, localize } from '../../../shared/i18n';
import { notifyError } from '../../../shared/notifications';
import {
  type LifecycleOutcome,
  postStartApplications,
  postStopApplications,
} from '../api/application-lifecycle.api';
import type { Application } from './application.types';
import { refreshApplication, refreshApplications } from './applications.store';

export function startApplications(applications: readonly Application[]): Promise<void> {
  return runLifecycleAction(applications, postStartApplications, 'applications.notify.startFailed');
}

export function stopApplications(applications: readonly Application[]): Promise<void> {
  return runLifecycleAction(applications, postStopApplications, 'applications.notify.stopFailed');
}

// *
// * Internal
// *

async function runLifecycleAction(
  applications: readonly Application[],
  request: (keys: readonly string[]) => ResultAsync<LifecycleOutcome, AppError>,
  failureKey: string,
): Promise<void> {
  if (applications.length === 0) {
    return;
  }
  const keys = applications.map(({ key }) => key);

  const result = await request(keys);

  result.match(
    ({ failedKeys }) => {
      failedKeys.forEach((key) => notifyFailure(failureKey, applications, key));
      // Also after a partial failure: the rows that did change state must not wait for the
      // websocket event, and refetching an unchanged one is harmless.
      resync(keys);
    },
    () => {
      keys.forEach((key) => notifyFailure(failureKey, applications, key));
    },
  );
}

/**
 * ! One request, not one per key. Requests into this app are serialized — see `shared/api/graphql`
 * ! — so a per-key refetch of a bulk action would cost as many round trips as it had targets, and
 * ! the lifecycle events arriving for the same keys would queue behind them.
 */
function resync(keys: readonly string[]): void {
  if (keys.length === 1 && keys[0] != null) {
    void refreshApplication(keys[0]);
    return;
  }

  void refreshApplications();
}

function notifyFailure(
  failureKey: string,
  applications: readonly Application[],
  key: string,
): void {
  const name = applications.find((application) => application.key === key)?.displayName ?? key;
  notifyError(localize($phrases.get(), failureKey, name));
}
