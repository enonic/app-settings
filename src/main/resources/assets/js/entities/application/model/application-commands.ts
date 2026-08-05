import type { ResultAsync } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import { i18n } from '../../../shared/i18n';
import { notifyError, notifySuccess } from '../../../shared/notifications';
import {
  type LifecycleOutcome,
  postStartApplications,
  postStopApplications,
  postUninstallApplications,
} from '../api/application-lifecycle.api';
import type { Application } from './application.types';
import { loadApplication, loadApplications } from './applications.load';

const TEXT = {
  startFailed: 'applications.notify.startFailed',
  stopFailed: 'applications.notify.stopFailed',
  uninstalled: 'applications.notify.uninstalled',
  uninstallFailed: 'applications.notify.uninstallFailed',
} as const;

export function startApplications(applications: readonly Application[]): Promise<void> {
  return runLifecycleAction(applications, postStartApplications, TEXT.startFailed);
}

export function stopApplications(applications: readonly Application[]): Promise<void> {
  return runLifecycleAction(applications, postStopApplications, TEXT.stopFailed);
}

export function uninstallApplications(applications: readonly Application[]): Promise<void> {
  return runLifecycleAction(
    applications,
    postUninstallApplications,
    TEXT.uninstallFailed,
    TEXT.uninstalled,
  );
}

// *
// * Internal
// *

async function runLifecycleAction(
  applications: readonly Application[],
  request: (keys: readonly string[]) => ResultAsync<LifecycleOutcome, AppError>,
  failureKey: string,
  successKey?: string,
): Promise<void> {
  if (applications.length === 0) {
    return;
  }
  const keys = applications.map(({ key }) => key);

  const result = await request(keys);

  result.match(
    ({ failedKeys }) => {
      failedKeys.forEach((key) => notifyError(i18n(failureKey, nameOf(applications, key))));

      if (successKey != null) {
        keys
          .filter((key) => !failedKeys.includes(key))
          .forEach((key) => notifySuccess(i18n(successKey, nameOf(applications, key))));
      }

      // Also after a partial failure: the rows that did change state must not wait for the
      // websocket event, and refetching an unchanged one is harmless.
      resync(keys);
    },
    () => {
      keys.forEach((key) => notifyError(i18n(failureKey, nameOf(applications, key))));
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
    void loadApplication(keys[0]);
    return;
  }

  void loadApplications();
}

function nameOf(applications: readonly Application[], key: string): string {
  return applications.find((application) => application.key === key)?.displayName ?? key;
}
