import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServerEvent, ServerEventListener } from '../../../shared/server-events';
import { loadMarketApplications } from './market.load';
import { affectsMarket, start, stop } from './market.service';
import { $marketApplications } from './market.store';

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

vi.mock('./market.load', () => ({ loadMarketApplications: vi.fn() }));

function applicationEvent(
  eventType: string,
  applicationKey = 'com.enonic.app.booster',
): ServerEvent {
  return { type: 'application', data: { eventType, applicationKey } };
}

function emit(event: ServerEvent): void {
  subscribed.listeners.forEach((listener) => (listener as ServerEventListener)(event));
}

function cacheCatalogue(): void {
  $marketApplications.set({ status: 'ready', items: [] });
}

beforeEach(() => {
  stop();
  subscribed.listeners = [];
  $marketApplications.set({ status: 'loading', items: [] });
  vi.mocked(loadMarketApplications).mockReset();
  vi.mocked(loadMarketApplications).mockResolvedValue(undefined);
});

describe('affectsMarket', () => {
  it('accepts the events that move an installed version', () => {
    expect(affectsMarket(applicationEvent('INSTALLED'))).toBe(true);
    expect(affectsMarket(applicationEvent('UNINSTALLED'))).toBe(true);
    expect(affectsMarket(applicationEvent('UPDATED'))).toBe(true);
  });

  it('ignores run state, which the catalogue does not carry', () => {
    expect(affectsMarket(applicationEvent('STARTED'))).toBe(false);
    expect(affectsMarket(applicationEvent('STOPPED'))).toBe(false);
  });

  it('ignores events of another type', () => {
    expect(affectsMarket({ type: 'node.updated' })).toBe(false);
    expect(affectsMarket({ type: 'application' })).toBe(false);
  });
});

describe('start', () => {
  it('reloads the catalogue when an application is uninstalled', () => {
    cacheCatalogue();
    start();

    emit(applicationEvent('UNINSTALLED'));

    expect(loadMarketApplications).toHaveBeenCalledTimes(1);
  });

  it('reloads it when an installed version changes under it', () => {
    cacheCatalogue();
    start();

    emit(applicationEvent('UPDATED'));

    expect(loadMarketApplications).toHaveBeenCalledTimes(1);
  });

  // Core publishes INSTALLED whatever installed the application — the market tab, an uploaded jar,
  // another operator, a jar in the deploy folder — and this is the only thing that answers for it.
  it('reloads it on an install, whatever started it', () => {
    cacheCatalogue();
    start();

    emit(applicationEvent('INSTALLED'));

    expect(loadMarketApplications).toHaveBeenCalledTimes(1);
  });

  // The one read that leaves the instance: an event nobody is looking at must not cost a call to
  // Enonic Market.
  it('asks for nothing while no catalogue has been loaded', () => {
    start();

    emit(applicationEvent('UNINSTALLED'));

    expect(loadMarketApplications).not.toHaveBeenCalled();
  });

  it('subscribes once however often it is started', () => {
    cacheCatalogue();
    start();
    start();

    emit(applicationEvent('UNINSTALLED'));

    expect(loadMarketApplications).toHaveBeenCalledTimes(1);
  });
});

describe('stop', () => {
  it('stops reloading once it has been stopped', () => {
    cacheCatalogue();
    start();
    stop();

    emit(applicationEvent('UNINSTALLED'));

    expect(loadMarketApplications).not.toHaveBeenCalled();
  });
});
