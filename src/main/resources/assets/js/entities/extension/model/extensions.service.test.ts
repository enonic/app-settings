import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setConfig, type ToolConfig } from '../../../shared/config';

const subscribeTopic = vi.hoisted(() => vi.fn());
vi.mock('../../../shared/admin-events', () => ({ subscribeTopic }));

const loadSectionExtensions = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./extensions.load', () => ({ loadSectionExtensions }));

import { start, stop } from './extensions.service';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    adminEvents: '/_/admin:events',
    extensions: '/_/admin:extension',
    graphql: '/_/app:graphql',
  },
} satisfies ToolConfig;

type Handlers = { onMessage: (data: unknown) => void; onLoss?: (count: number | null) => void };

function subscribedHandlers(): Handlers {
  return subscribeTopic.mock.calls[0][1] as Handlers;
}

describe('extensions.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setConfig(config);
    subscribeTopic.mockReturnValue(() => {});
  });

  afterEach(() => {
    stop();
    vi.runAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('subscribes to the applications topic the contract names', () => {
    start();

    expect(subscribeTopic).toHaveBeenCalledWith(
      'com.enonic.xp.app.settings:applications',
      expect.anything(),
    );
  });

  it('subscribes once however often it is started', () => {
    start();
    start();

    expect(subscribeTopic).toHaveBeenCalledTimes(1);
  });

  it('rediscovers once for a burst of publishes', async () => {
    start();
    const { onMessage } = subscribedHandlers();

    onMessage({});
    onMessage({});
    onMessage({});
    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).toHaveBeenCalledTimes(1);
  });

  it('rediscovers on a detected loss, countable or not', async () => {
    start();
    const { onLoss } = subscribedHandlers();

    onLoss?.(null);
    await vi.runAllTimersAsync();

    expect(loadSectionExtensions).toHaveBeenCalledTimes(1);
  });

  it('drops the subscription and the pending reload on stop', async () => {
    const unsubscribe = vi.fn();
    subscribeTopic.mockReturnValue(unsubscribe);
    start();
    const { onMessage } = subscribedHandlers();

    onMessage({});
    stop();
    await vi.runAllTimersAsync();

    expect(unsubscribe).toHaveBeenCalled();
    expect(loadSectionExtensions).not.toHaveBeenCalled();
  });

  it('resubscribes after a stop', () => {
    start();
    stop();
    start();

    expect(subscribeTopic).toHaveBeenCalledTimes(2);
  });
});
