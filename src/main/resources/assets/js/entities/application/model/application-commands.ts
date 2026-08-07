import type { Result, ResultAsync } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import { i18n } from '../../../shared/i18n';
import { notifyError, notifySuccess } from '../../../shared/notifications';
import { $serverEventsConnected } from '../../../shared/server-events';
import {
  type LifecycleOutcome,
  postStartApplications,
  postStopApplications,
  postUninstallApplications,
} from '../api/application-lifecycle.api';
import {
  type InstalledApplication,
  postInstallApplicationFromFile,
  postInstallApplicationFromUrl,
} from '../api/applications.api';
import { beginUpload, endUpload, receiveUploadProgress } from './application-uploads.store';
import type { Application } from './application.types';
import { loadApplication, loadApplications } from './applications.load';

const TEXT = {
  startFailed: 'applications.notify.startFailed',
  stopFailed: 'applications.notify.stopFailed',
  uninstalled: 'applications.notify.uninstalled',
  uninstallFailed: 'applications.notify.uninstallFailed',
  installed: 'applications.notify.installed',
  installFailed: 'applications.notify.installFailed',
  uploadFailed: 'applications.notify.uploadFailed',
  updated: 'applications.notify.updated',
  updateFailed: 'applications.notify.updateFailed',
} as const;

export type InstallApplicationParams = {
  /** What the notifications name it: the market's display name, not a key. */
  displayName: string;
  url: string;
  sha512?: string;
  /** An update of something already installed, which is all the wording differs by. */
  updating?: boolean;
};

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

export async function installApplication({
  displayName,
  url,
  sha512,
  updating = false,
}: InstallApplicationParams): Promise<Result<InstalledApplication, AppError>> {
  const result = await postInstallApplicationFromUrl({ url, sha512 });

  result.match(
    ({ key }) => {
      notifySuccess(i18n(updating ? TEXT.updated : TEXT.installed, displayName));
      resyncWithoutEvents([key]);
    },
    (error) =>
      notifyError(
        i18n(updating ? TEXT.updateFailed : TEXT.installFailed, displayName, error.message),
      ),
  );

  return result;
}

export async function uploadApplication(
  file: File,
): Promise<Result<InstalledApplication, AppError>> {
  const id = beginUpload(file.name);

  const result = await postInstallApplicationFromFile({
    file,
    onProgress: (percent) => receiveUploadProgress(id, percent),
  });

  result.match(
    ({ key, displayName }) => {
      notifySuccess(i18n(TEXT.installed, displayName));
      resyncWithoutEvents([key]);
    },
    (error) => notifyError(i18n(TEXT.uploadFailed, file.name, error.message)),
  );

  endUpload(id);

  return result;
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

      const changedKeys = keys.filter((key) => !failedKeys.includes(key));

      if (successKey != null) {
        changedKeys.forEach((key) => notifySuccess(i18n(successKey, nameOf(applications, key))));
      }

      resyncWithoutEvents(changedKeys);
    },
    () => {
      keys.forEach((key) => notifyError(i18n(failureKey, nameOf(applications, key))));
    },
  );
}

/**
 * Refetches only where no lifecycle event will. XP publishes STARTED/STOPPED from inside the call
 * serving this request, so a live socket has already refetched through `applications.service`.
 *
 * ! One request, not one per key: requests into this app are serialized.
 */
function resyncWithoutEvents(keys: readonly string[]): void {
  if (keys.length === 0 || $serverEventsConnected.get()) {
    return;
  }

  if (keys.length === 1 && keys[0] != null) {
    void loadApplication(keys[0]);
    return;
  }

  void loadApplications();
}

function nameOf(applications: readonly Application[], key: string): string {
  return applications.find((application) => application.key === key)?.displayName ?? key;
}
