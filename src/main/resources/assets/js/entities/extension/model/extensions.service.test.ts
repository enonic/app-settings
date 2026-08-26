import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  $serverEventsConnected,
  type ServerEvent,
  type ServerEventListener,
} from '../../../shared/server-events';
import { loadSectionExtensions } from './extensions.load';
import { affectsSections, start, stop } from './extensions.service';

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

vi.mock('./extensions.load', () => ({ loadSectionExtensions: vi.fn() }));

function applicationEvent(eventType: string): ServerEvent {
  return { type: 'application', data: { eventType, applicationKey: 'com.enonic.app.users' } };
}

function emit(event: ServerEvent): void {
  subscribed.listeners.forEach((listener) => (listener as ServerEventListener)(event));
}

beforeEach(() => {
  vi.useFakeTimers();
  start();
});

afterEach(() => {
  stop();
  subscribed.listeners = [];
  $serverEventsConnected.set(false);
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('affectsSections', () => {
  it('accepts the lifecycle events that change which sections exist', () => {
    ['INSTALLED', 'UNINSTALLED', 'STARTED', 'STOPPED', 'UPDATED'].forEach((eventType) => {
      expect(affectsSections(applicationEvent(eventType))).toBe(true);
    });
  });

  it('rejects the progress burst an install fires while it downloads', () => {
    expect(affectsSections(applicationEvent('PROGRESS'))).toBe(false);
  });

  it('rejects everything that is not an application event', () => {
    expect(affectsSections({ type: 'node.updated' })).toBe(false);
    expect(affectsSections({ type: 'application' })).toBe(false);
  });
});

describe('the service', () => {
  it('rediscovers after an application event', async () => {
    emit(applicationEvent('UNINSTALLED'));

    expect(loadSectionExtensions).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(loadSectionExtensions).toHaveBeenCalledTimes(1);
  });

  it('rediscovers once for a burst', async () => {
    emit(applicationEvent('INSTALLED'));
    emit(applicationEvent('STARTED'));
    emit(applicationEvent('UPDATED'));

    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).toHaveBeenCalledTimes(1);
  });

  it('leaves the rail alone for an event that changes no section', async () => {
    emit(applicationEvent('PROGRESS'));
    emit({ type: 'node.updated' });

    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).not.toHaveBeenCalled();
  });

  it('rediscovers after a reconnect, because the events missed are gone for good', async () => {
    $serverEventsConnected.set(true);
    $serverEventsConnected.set(false);
    $serverEventsConnected.set(true);

    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).toHaveBeenCalledTimes(1);
  });

  it('does not treat the first connect as a reconnect', async () => {
    $serverEventsConnected.set(true);

    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).not.toHaveBeenCalled();
  });

  it('subscribes once however often it is started', () => {
    start();
    start();

    expect(subscribed.listeners).toHaveLength(1);
  });

  it('drops a pending rediscovery when it stops', async () => {
    emit(applicationEvent('UNINSTALLED'));
    stop();

    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).not.toHaveBeenCalled();
    expect(subscribed.listeners).toHaveLength(0);
  });
});
