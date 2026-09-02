import { sendToTopic } from '/lib/xp/admin';
import { listener } from '/lib/xp/event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { initApplications } from './applications';

type EventCallback = (event: { type: string; data: Record<string, unknown> }) => void;

function applicationCallback(): EventCallback {
  const call = vi.mocked(listener).mock.calls.find(([params]) => params.type === 'application');
  if (call == null) {
    throw new Error('No application listener registered');
  }
  return call[0].callback as EventCallback;
}

/** What core reports a download by: `ApplicationLoader.progress()` has no key to give. */
const DOWNLOAD_URL = 'https://repo/app-1.0.0.jar';

function progressEvent(progress: number): Record<string, unknown> {
  return { eventType: 'PROGRESS', applicationUrl: DOWNLOAD_URL, progress };
}

describe('initApplications', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('publishes only a validated application payload', () => {
    initApplications();
    const callback = applicationCallback();

    callback({ type: 'application', data: { eventType: 'STARTED' } }); // no key
    callback({ type: 'application', data: { applicationKey: 'a' } }); // no type
    expect(sendToTopic).not.toHaveBeenCalled();

    callback({ type: 'application', data: { eventType: 'STOPPED', applicationKey: 'a' } });
    expect(sendToTopic).toHaveBeenCalledWith('applications', {
      eventType: 'STOPPED',
      key: 'a',
      systemApplication: false,
    });
  });

  it('publishes a download percent on the progress topic, never on applications', () => {
    initApplications();

    applicationCallback()({
      type: 'application',
      data: progressEvent(42),
    });

    expect(sendToTopic).toHaveBeenCalledExactlyOnceWith('application-progress', {
      url: DOWNLOAD_URL,
      percent: 42,
    });
  });

  it('publishes the ends of the range, which carry no less than the middle', () => {
    initApplications();
    const callback = applicationCallback();

    callback({ type: 'application', data: progressEvent(0) });
    callback({ type: 'application', data: progressEvent(100) });

    expect(sendToTopic).toHaveBeenNthCalledWith(1, 'application-progress', {
      url: DOWNLOAD_URL,
      percent: 0,
    });
    expect(sendToTopic).toHaveBeenNthCalledWith(2, 'application-progress', {
      url: DOWNLOAD_URL,
      percent: 100,
    });
  });

  it.each<[string, Record<string, unknown>]>([
    ['no url', { eventType: 'PROGRESS', progress: 42 }],
    ['an empty url', { ...progressEvent(42), applicationUrl: '' }],
    ['no percent', { eventType: 'PROGRESS', applicationUrl: DOWNLOAD_URL }],
    ['a percent that is a string', { ...progressEvent(42), progress: '42' }],
    ['a percent that is NaN', { ...progressEvent(42), progress: Number.NaN }],
    ['a percent that is infinite', { ...progressEvent(42), progress: Number.POSITIVE_INFINITY }],
    ['a percent below the range', progressEvent(-1)],
    ['a percent above the range', progressEvent(101)],
  ])('publishes no progress with %s', (_case, data) => {
    initApplications();

    applicationCallback()({ type: 'application', data });

    expect(sendToTopic).not.toHaveBeenCalled();
  });

  it('keeps lifecycle events off the progress topic', () => {
    initApplications();

    applicationCallback()({
      type: 'application',
      // A lifecycle event carrying a stray url is still not progress.
      data: {
        eventType: 'INSTALLED',
        applicationKey: 'a',
        applicationUrl: DOWNLOAD_URL,
        progress: 42,
      },
    });

    expect(sendToTopic).toHaveBeenCalledExactlyOnceWith('applications', {
      eventType: 'INSTALLED',
      key: 'a',
      systemApplication: false,
    });
  });
});
