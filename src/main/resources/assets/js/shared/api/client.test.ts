import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestJson } from './client';
import { AppError } from './errors';

const mockFetch = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('requestJson', () => {
  it('resolves with the parsed body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'app-settings' }));

    const result = await requestJson<{ id: string }>('/api/apps');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ id: 'app-settings' });
  });

  it('defaults to GET and sends no body or content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await requestJson('/api/apps');

    const [, init] = mockFetch.mock.calls[0] ?? [];
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toBeUndefined();
  });

  it('serializes the body and sets the JSON content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await requestJson('/api/apps', { method: 'POST', body: { key: 'com.enonic.xp.app.settings' } });

    const [, init] = mockFetch.mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"key":"com.enonic.xp.app.settings"}');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('fails with the server-supplied message on an error status', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not authorized' }, { status: 403 }));

    const result = await requestJson('/api/apps');

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Not authorized');
  });

  it('falls back to the status text when the error body carries no message', async () => {
    mockFetch.mockResolvedValue(
      new Response('nope', { status: 500, statusText: 'Internal Server Error' }),
    );

    const result = await requestJson('/api/apps');

    expect(result._unsafeUnwrapErr().message).toBe('Internal Server Error');
  });

  it('wraps a rejected fetch instead of throwing', async () => {
    mockFetch.mockRejectedValue(new TypeError('network down'));

    const result = await requestJson('/api/apps');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AppError);
  });
});
