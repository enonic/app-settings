import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  $serverEventsConnected,
  type ServerEvent,
  type ServerEventListener,
} from '../../../shared/server-events';
import { invalidateApplicationInfo } from './application-info.store';
import { loadApplication, loadApplications } from './applications.load';
import { start, stop, toApplicationChange } from './applications.service';
import { $applications, removeApplication } from './applications.store';

const subscribed = vi.hoisted(() => ({ listeners: [] as unknown[] }));

vi.mock('../../../shared/server-events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/server-events')>()),
  onServerEvent: vi.fn((listener: unknown) => {
    subscribed.listeners.push(listener);
    return () => {
      subscribed.listeners = subscribed.listeners.filter((entry) => entry !== listener);
    };
  }),
}));

vi.mock('./application-info.store', () => ({ invalidateApplicationInfo: vi.fn() }));

vi.mock('./applications.load', () => ({
  loadApplication: vi.fn(),
  loadApplications: vi.fn(),
}));

vi.mock('./applications.store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./applications.store')>()),
  removeApplication: vi.fn(),
}));

function applicationEvent(eventType: string, applicationKey?: string): ServerEvent {
  return { type: 'application', data: { eventType, applicationKey } };
}

function emit(event: ServerEvent): void {
  subscribed.listeners.forEach((listener) => (listener as ServerEventListener)(event));
}

describe('toApplicationChange', () => {
  it('reads the three terminal lifecycle events as a change to one application', () => {
    expect(toApplicationChange(applicationEvent('STARTED', 'a'))).toEqual({
      kind: 'changed',
      key: 'a',
    });
    expect(toApplicationChange(applicationEvent('STOPPED', 'a'))).toEqual({
      kind: 'changed',
      key: 'a',
    });
    expect(toApplicationChange(applicationEvent('UPDATED', 'a'))).toEqual({
      kind: 'changed',
      key: 'a',
    });
  });

  it('tells an install and an uninstall apart from a change', () => {
    expect(toApplicationChange(applicationEvent('INSTALLED', 'a'))).toEqual({
      kind: 'installed',
      key: 'a',
    });
    expect(toApplicationChange(applicationEvent('UNINSTALLED', 'a'))).toEqual({
      kind: 'uninstalled',
      key: 'a',
    });
  });

  it('skips the transient states between the terminal ones', () => {
    for (const transient of ['STARTING', 'STOPPING', 'RESOLVED', 'UNRESOLVED', 'PROGRESS']) {
      expect(toApplicationChange(applicationEvent(transient, 'a'))).toBeUndefined();
    }
  });

  it('skips events of other types and events naming no application', () => {
    expect(toApplicationChange({ type: 'node.updated' })).toBeUndefined();
    expect(toApplicationChange(applicationEvent('STARTED'))).toBeUndefined();
  });
});

describe('the applications service', () => {
  beforeEach(() => {
    subscribed.listeners = [];
    vi.mocked(loadApplication).mockReset();
    vi.mocked(loadApplications).mockReset();
    vi.mocked(removeApplication).mockReset();
    vi.mocked(invalidateApplicationInfo).mockReset();
    $applications.set({ status: 'ready', items: [] });
    $serverEventsConnected.set(false);
    start();
  });

  afterEach(() => {
    stop();
  });

  it('subscribes once, however often it is started', () => {
    start();

    expect(subscribed.listeners).toHaveLength(1);
  });

  it('refetches the one application a state change names', () => {
    emit(applicationEvent('STOPPED', 'com.enonic.app.booster'));

    expect(loadApplication).toHaveBeenCalledWith('com.enonic.app.booster');
    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('reloads the whole list for an application that was not there before', () => {
    emit(applicationEvent('INSTALLED', 'com.enonic.app.fathom'));

    expect(loadApplications).toHaveBeenCalledTimes(1);
  });

  it('drops an uninstalled application without asking the server', () => {
    emit(applicationEvent('UNINSTALLED', 'com.enonic.app.fathom'));

    expect(removeApplication).toHaveBeenCalledWith('com.enonic.app.fathom');
    expect(loadApplications).not.toHaveBeenCalled();
    expect(loadApplication).not.toHaveBeenCalled();
  });

  it('forgets what the application provides, whatever the change was', () => {
    emit(applicationEvent('UPDATED', 'com.enonic.app.booster'));

    expect(invalidateApplicationInfo).toHaveBeenCalledWith('com.enonic.app.booster');
  });

  it('ignores an event it cannot read as a change', () => {
    emit(applicationEvent('PROGRESS', 'com.enonic.app.booster'));

    expect(invalidateApplicationInfo).not.toHaveBeenCalled();
    expect(loadApplication).not.toHaveBeenCalled();
  });

  it('reloads the list after a reconnect, which may have missed events', () => {
    $serverEventsConnected.set(true);
    expect(loadApplications).not.toHaveBeenCalled();

    $serverEventsConnected.set(false);
    $serverEventsConnected.set(true);

    expect(loadApplications).toHaveBeenCalledTimes(1);
  });

  it('leaves a list it never loaded alone, on a reconnect and on an install alike', () => {
    $applications.set({ status: 'loading', items: [] });

    $serverEventsConnected.set(true);
    $serverEventsConnected.set(false);
    $serverEventsConnected.set(true);
    emit(applicationEvent('INSTALLED', 'com.enonic.app.fathom'));

    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('stops listening once it is stopped', () => {
    stop();
    emit(applicationEvent('STOPPED', 'com.enonic.app.booster'));

    expect(subscribed.listeners).toHaveLength(0);
    expect(loadApplication).not.toHaveBeenCalled();
  });
});
