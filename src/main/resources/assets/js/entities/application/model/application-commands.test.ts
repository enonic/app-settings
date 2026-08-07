import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../../shared/api';
import { setPhrases } from '../../../shared/i18n';
import { $notifications, clearNotifications } from '../../../shared/notifications';
import { $serverEventsConnected } from '../../../shared/server-events';
import {
  postStartApplications,
  postStopApplications,
  postUninstallApplications,
} from '../api/application-lifecycle.api';
import { startApplications, stopApplications, uninstallApplications } from './application-commands';
import type { Application } from './application.types';
import { loadApplication, loadApplications } from './applications.load';

vi.mock('../api/application-lifecycle.api', () => ({
  postStartApplications: vi.fn(),
  postStopApplications: vi.fn(),
  postUninstallApplications: vi.fn(),
}));

vi.mock('./applications.load', () => ({
  loadApplication: vi.fn(),
  loadApplications: vi.fn(),
}));

function application(key: string, displayName: string): Application {
  return { key, displayName, state: 'STOPPED', system: false, local: false };
}

const booster = application('com.enonic.app.booster', 'Booster');
const fathom = application('com.enonic.app.fathom', 'Fathom');

function notificationTexts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

// The resync only runs with the socket down, so every test asserting it says so.
beforeEach(() => {
  clearNotifications();
  $serverEventsConnected.set(false);
  setPhrases(
    {
      'applications.notify.startFailed': 'Could not start {0}',
      'applications.notify.stopFailed': 'Could not stop {0}',
      'applications.notify.uninstalled': '{0} was uninstalled',
      'applications.notify.uninstallFailed': 'Could not uninstall {0}',
    },
    'en',
  );
  vi.mocked(postStartApplications).mockReset();
  vi.mocked(postStopApplications).mockReset();
  vi.mocked(postUninstallApplications).mockReset();
  vi.mocked(loadApplication).mockReset();
  vi.mocked(loadApplication).mockResolvedValue(undefined);
  vi.mocked(loadApplications).mockReset();
  vi.mocked(loadApplications).mockResolvedValue(undefined);
});

describe('startApplications', () => {
  it('is silent on success and refetches the one row it changed', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await startApplications([booster]);

    expect(postStartApplications).toHaveBeenCalledWith([booster.key]);
    expect(notificationTexts()).toEqual([]);
    expect(loadApplication).toHaveBeenCalledWith(booster.key);
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('reloads the whole list after a bulk action rather than one row at a time', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await startApplications([booster, fathom]);

    expect(postStartApplications).toHaveBeenCalledWith([booster.key, fathom.key]);
    expect(loadApplications).toHaveBeenCalledTimes(1);
    expect(loadApplication).not.toHaveBeenCalled();
  });

  it('names the application the server refused to start, and resyncs only the one that started', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [fathom.key] }));

    await startApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Could not start Fathom']);
    expect(loadApplication).toHaveBeenCalledWith(booster.key);
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('refetches nothing when the server refused every target', async () => {
    vi.mocked(postStartApplications).mockReturnValue(
      okAsync({ failedKeys: [booster.key, fathom.key] }),
    );

    await startApplications([booster, fathom]);

    expect(loadApplication).not.toHaveBeenCalled();
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('leaves the refetch to the server event while the socket is up', async () => {
    $serverEventsConnected.set(true);
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await startApplications([booster]);

    expect(postStartApplications).toHaveBeenCalledWith([booster.key]);
    expect(loadApplication).not.toHaveBeenCalled();
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('reports every target when the request itself fails, and refetches nothing', async () => {
    vi.mocked(postStartApplications).mockReturnValue(errAsync(new AppError('Forbidden')));

    await startApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Could not start Booster', 'Could not start Fathom']);
    expect(loadApplication).not.toHaveBeenCalled();
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('asks the server nothing for an empty target list', async () => {
    await startApplications([]);

    expect(postStartApplications).not.toHaveBeenCalled();
  });
});

describe('stopApplications', () => {
  it('names the application the server refused to stop', async () => {
    vi.mocked(postStopApplications).mockReturnValue(okAsync({ failedKeys: [booster.key] }));

    await stopApplications([booster]);

    expect(notificationTexts()).toEqual(['Could not stop Booster']);
  });
});

describe('uninstallApplications', () => {
  it('names every application that went, unlike Start and Stop', async () => {
    vi.mocked(postUninstallApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await uninstallApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Booster was uninstalled', 'Fathom was uninstalled']);
  });

  // The deploy-directory case: the server refuses one target and takes the other, and the pair of
  // toasts is the only place that shows up.
  it('reports the refused application and the one that went', async () => {
    vi.mocked(postUninstallApplications).mockReturnValue(okAsync({ failedKeys: [fathom.key] }));

    await uninstallApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Could not uninstall Fathom', 'Booster was uninstalled']);
    expect(loadApplication).toHaveBeenCalledWith(booster.key);
  });

  it('claims nothing was uninstalled when the request itself fails', async () => {
    vi.mocked(postUninstallApplications).mockReturnValue(errAsync(new AppError('Forbidden')));

    await uninstallApplications([booster]);

    expect(notificationTexts()).toEqual(['Could not uninstall Booster']);
    expect(loadApplication).not.toHaveBeenCalled();
  });
});
