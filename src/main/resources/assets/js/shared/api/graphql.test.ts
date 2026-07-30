import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setConfig, type ToolConfig } from '../config';
import { $config } from '../config/config.store';
import { requestGraphQl } from './graphql';

const config = {
  appId: 'com.enonic.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: { events: 'ws:/_/admin:event', graphql: '/_/app:graphql' },
} satisfies ToolConfig;

function respondWith(body: unknown, status = 200): void {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('requestGraphQl', () => {
  beforeEach(() => {
    setConfig(config);
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('resolves the data payload', async () => {
    respondWith({ data: { systemVersion: '8.1.0' } });

    const result = await requestGraphQl<{ systemVersion: string }>('{ systemVersion }');

    expect(result.isOk() && result.value).toEqual({ systemVersion: '8.1.0' });
  });

  it('posts the query and variables to the url from the tool config', async () => {
    respondWith({ data: {} });

    await requestGraphQl('query Q($k: String) { x(key: $k) }', { k: 'app' });

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0] as [
      string,
      { method?: string; body?: string },
    ];
    expect(url).toBe('/_/app:graphql');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body ?? '')).toEqual({
      query: 'query Q($k: String) { x(key: $k) }',
      variables: { k: 'app' },
    });
  });

  it('fails with the first GraphQL error message', async () => {
    respondWith({ errors: [{ message: 'Field undefined' }, { message: 'ignored' }] });

    const result = await requestGraphQl('{ nope }');

    expect(result.isErr() && result.error.message).toBe('Field undefined');
  });

  it('fails even when errors arrive alongside partial data', async () => {
    respondWith({ data: { systemVersion: null }, errors: [{ message: 'Resolver blew up' }] });

    const result = await requestGraphQl('{ systemVersion }');

    expect(result.isErr() && result.error.message).toBe('Resolver blew up');
  });

  it('falls back to a generic message when an error carries none', async () => {
    respondWith({ errors: [{}] });

    const result = await requestGraphQl('{ nope }');

    expect(result.isErr() && result.error.message).toBe('GraphQL request failed');
  });

  it('fails when the response carries neither data nor errors', async () => {
    respondWith({});

    const result = await requestGraphQl('{ systemVersion }');

    expect(result.isErr() && result.error.message).toBe(
      'GraphQL response carried neither data nor errors',
    );
  });

  it('surfaces the server message on a non-200 status', async () => {
    respondWith({ message: 'Request body carries no `query` string' }, 400);

    const result = await requestGraphQl('');

    expect(result.isErr() && result.error.message).toBe('Request body carries no `query` string');
  });

  it('fails without reaching the network when the config was never set', async () => {
    $config.set(undefined);
    globalThis.fetch = vi.fn();

    const result = await requestGraphQl('{ systemVersion }');

    expect(result.isErr()).toBe(true);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });
});
