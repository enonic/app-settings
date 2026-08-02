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

type PendingRequest = {
  query: unknown;
  respondWith: (body: unknown) => void;
  fail: (error: unknown) => void;
};

/**
 * Hands every `fetch` call back unsettled, so a test can count what reached the network. Settle all of
 * them: the queue is module state, and one left pending stalls whichever test runs next.
 */
function captureRequests(): PendingRequest[] {
  const requests: PendingRequest[] = [];

  globalThis.fetch = vi.fn((_url: unknown, options?: { body?: string }) => {
    const { query } = JSON.parse(options?.body ?? '{}') as { query?: unknown };
    return new Promise<Response>((resolve, reject) => {
      requests.push({
        query,
        respondWith: (body) => resolve(new Response(JSON.stringify(body))),
        fail: reject,
      });
    });
  }) as unknown as typeof globalThis.fetch;

  return requests;
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

  it('holds a second operation back until the first has answered', async () => {
    const requests = captureRequests();

    const first = requestGraphQl<{ a: number }>('{ a }');
    const second = requestGraphQl<{ b: number }>('{ b }');

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.query).toBe('{ a }');

    requests[0]?.respondWith({ data: { a: 1 } });
    const firstResult = await first;
    expect(firstResult.isOk() && firstResult.value).toEqual({ a: 1 });

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.query).toBe('{ b }');

    requests[1]?.respondWith({ data: { b: 2 } });
    const secondResult = await second;
    expect(secondResult.isOk() && secondResult.value).toEqual({ b: 2 });
  });

  it('keeps the queue moving when the operation ahead fails', async () => {
    const requests = captureRequests();

    const first = requestGraphQl('{ a }');
    const second = requestGraphQl<{ b: number }>('{ b }');

    await vi.waitFor(() => expect(requests).toHaveLength(1));
    requests[0]?.fail(new TypeError('Network is down'));
    expect((await first).isErr()).toBe(true);

    await vi.waitFor(() => expect(requests).toHaveLength(2));
    requests[1]?.respondWith({ data: { b: 2 } });
    const secondResult = await second;
    expect(secondResult.isOk() && secondResult.value).toEqual({ b: 2 });
  });
});
