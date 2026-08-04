import { errAsync, okAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../../shared/api';
import { setPhrases } from '../../../shared/i18n';
import { $notifications, clearNotifications } from '../../../shared/notifications';
import { postStartApplications, postStopApplications } from '../api/application-lifecycle.api';
import { startApplications, stopApplications } from './application-commands';
import type { Application } from './application.types';
import { refreshApplication, refreshApplications } from './applications.store';

vi.mock('../api/application-lifecycle.api', () => ({
  postStartApplications: vi.fn(),
  postStopApplications: vi.fn(),
}));

vi.mock('./applications.store', () => ({
  refreshApplication: vi.fn(),
  refreshApplications: vi.fn(),
}));

function application(key: string, displayName: string): Application {
  return { key, displayName, state: 'STOPPED', system: false };
}

const booster = application('com.enonic.app.booster', 'Booster');
const fathom = application('com.enonic.app.fathom', 'Fathom');

function notificationTexts(): string[] {
  return $notifications.get().map(({ text }) => text);
}

beforeEach(() => {
  clearNotifications();
  setPhrases(
    {
      'applications.notify.startFailed': 'Could not start {0}',
      'applications.notify.stopFailed': 'Could not stop {0}',
    },
    'en',
  );
  vi.mocked(postStartApplications).mockReset();
  vi.mocked(postStopApplications).mockReset();
  vi.mocked(refreshApplication).mockReset();
  vi.mocked(refreshApplication).mockResolvedValue(undefined);
  vi.mocked(refreshApplications).mockReset();
  vi.mocked(refreshApplications).mockResolvedValue(undefined);
});

describe('startApplications', () => {
  it('is silent on success and refetches the one row it changed', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await startApplications([booster]);

    expect(postStartApplications).toHaveBeenCalledWith([booster.key]);
    expect(notificationTexts()).toEqual([]);
    expect(refreshApplication).toHaveBeenCalledWith(booster.key);
    expect(refreshApplications).not.toHaveBeenCalled();
  });

  it('reloads the whole list after a bulk action rather than one row at a time', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [] }));

    await startApplications([booster, fathom]);

    expect(postStartApplications).toHaveBeenCalledWith([booster.key, fathom.key]);
    expect(refreshApplications).toHaveBeenCalledTimes(1);
    expect(refreshApplication).not.toHaveBeenCalled();
  });

  it('names the application the server refused to start, and resyncs anyway', async () => {
    vi.mocked(postStartApplications).mockReturnValue(okAsync({ failedKeys: [fathom.key] }));

    await startApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Could not start Fathom']);
    expect(refreshApplications).toHaveBeenCalledTimes(1);
  });

  it('reports every target when the request itself fails, and refetches nothing', async () => {
    vi.mocked(postStartApplications).mockReturnValue(errAsync(new AppError('Forbidden')));

    await startApplications([booster, fathom]);

    expect(notificationTexts()).toEqual(['Could not start Booster', 'Could not start Fathom']);
    expect(refreshApplication).not.toHaveBeenCalled();
    expect(refreshApplications).not.toHaveBeenCalled();
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
