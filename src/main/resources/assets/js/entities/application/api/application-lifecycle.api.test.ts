import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { postStartApplications, postStopApplications } from './application-lifecycle.api';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    events: 'ws:/_/admin:event',
    graphql: '/_/app:graphql',
    serverApp: { start: '/_/server:app/start', stop: '/_/server:app/stop' },
  },
} satisfies ToolConfig;

function respondWith(body: unknown): void {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
}

beforeEach(() => {
  setConfig(config);
});

afterEach(() => {
  $config.set(undefined);
  vi.restoreAllMocks();
});

describe('postStartApplications', () => {
  it('posts every key to the start url in one request', async () => {
    respondWith({ results: [{ id: 'a', success: true }] });

    await postStartApplications(['a', 'b']);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/_/server:app/start',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: ['a', 'b'] }) }),
    );
  });

  it('reports the keys whose action the server refused', async () => {
    respondWith({
      results: [
        { id: 'a', success: true },
        { id: 'b', success: false },
      ],
    });

    const result = await postStartApplications(['a', 'b']);

    expect(result._unsafeUnwrap()).toEqual({ failedKeys: ['b'] });
  });

  it('fails with the server-supplied message on an error status', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"Forbidden"}', { status: 403 }));

    const result = await postStartApplications(['a']);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('Forbidden');
  });
});

describe('postStopApplications', () => {
  it('posts to the stop url', async () => {
    respondWith({ results: [] });

    await postStopApplications(['a']);

    expect(globalThis.fetch).toHaveBeenCalledWith('/_/server:app/stop', expect.anything());
  });
});
