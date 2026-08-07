import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import type { PrincipalKey } from '../model/principal.types';
import { sendPrincipalDeletion } from './principal-deletion.api';

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

let sent: { query?: string; variables?: unknown } | undefined;

function respondWith(body: unknown): void {
  globalThis.fetch = vi.fn((_url: unknown, options?: { body?: string }) => {
    sent = JSON.parse(options?.body ?? '{}') as { query?: string; variables?: unknown };
    return Promise.resolve(new Response(JSON.stringify(body)));
  }) as unknown as typeof globalThis.fetch;
}

const keys = ['role:editors', 'user:system:jane'] as PrincipalKey[];

describe('sendPrincipalDeletion', () => {
  beforeEach(() => {
    setConfig(config);
    sent = undefined;
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('sends every key in one mutation, through a variable rather than the query text', async () => {
    respondWith({ data: { deletePrincipals: [] } });

    await sendPrincipalDeletion(keys);

    expect(sent?.variables).toEqual({ keys });
    expect(sent?.query).not.toContain('role:editors');
  });

  it('maps the per-key outcome the server answered', async () => {
    respondWith({
      data: {
        deletePrincipals: [
          { key: 'role:editors', deleted: true, reason: null },
          { key: 'user:system:jane', deleted: false, reason: 'Not allowed' },
        ],
      },
    });

    const outcomes = (await sendPrincipalDeletion(keys))._unsafeUnwrap();

    expect(outcomes).toEqual([
      { key: 'role:editors', deleted: true, reason: undefined },
      { key: 'user:system:jane', deleted: false, reason: 'Not allowed' },
    ]);
  });

  it('reports an empty reason as no reason', async () => {
    respondWith({
      data: { deletePrincipals: [{ key: 'role:editors', deleted: true, reason: '' }] },
    });

    const outcomes = (await sendPrincipalDeletion(keys))._unsafeUnwrap();

    expect(outcomes[0]?.reason).toBeUndefined();
  });

  it('fails when the field came back null', async () => {
    respondWith({ data: { deletePrincipals: null } });

    expect((await sendPrincipalDeletion(keys)).isErr()).toBe(true);
  });

  it('fails on a server error', async () => {
    respondWith({ errors: [{ message: 'Forbidden' }] });

    expect((await sendPrincipalDeletion(keys)).isErr()).toBe(true);
  });
});
