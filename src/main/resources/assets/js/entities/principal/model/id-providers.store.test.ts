import { okAsync, ResultAsync } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchIdProviders } from '../api/id-providers.api';
import { $idProviders, loadIdProviders } from './id-providers.store';
import type { IdProvider } from './principal.types';

// The store owns cancellation and status, not transport: stubbing the api keeps the request out of
// it and lets a test hold one answer back to show a slow load losing to a fast one.
vi.mock('../api/id-providers.api', () => ({ fetchIdProviders: vi.fn() }));

function provider(key: string, users = 0, bound = true): IdProvider {
  return {
    key,
    displayName: key,
    users: { total: users },
    groups: { total: 0 },
    ...(bound
      ? { application: { key: 'com.example.provider', displayName: 'Example provider' } }
      : {}),
  };
}

beforeEach(() => {
  vi.mocked(fetchIdProviders).mockReset();
  vi.mocked(fetchIdProviders).mockReturnValue(okAsync([provider('system', 3)]));
});

describe('loadIdProviders', () => {
  it('starts out loading with nothing to show', () => {
    expect($idProviders.get().status).toBe('loading');
    expect($idProviders.get().items).toEqual([]);
  });

  it('resolves to the providers the api returned', async () => {
    await loadIdProviders();

    const { status, items, error } = $idProviders.get();
    expect(status).toBe('ready');
    expect(items).toEqual([provider('system', 3)]);
    expect(error).toBeUndefined();
  });

  it('carries the count of a provider without its rows, and leaves an unbound one without a config', async () => {
    vi.mocked(fetchIdProviders).mockReturnValue(
      okAsync([provider('system', 3), provider('partners', 0, false)]),
    );

    await loadIdProviders();

    const { items } = $idProviders.get();
    const system = items.find(({ key }) => key === 'system');
    expect(system?.users.total).toBe(3);
    expect(system?.users.items).toBeUndefined();
    expect(items.find(({ key }) => key === 'partners')?.application).toBeUndefined();
  });

  it('reports loading again while it reloads', async () => {
    await loadIdProviders();

    const seen: string[] = [];
    const unbind = $idProviders.subscribe(({ status }) => seen.push(status));
    await loadIdProviders();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });

  it('drops the answer of the load a newer one replaced', async () => {
    const stale = provider('stale');
    const fresh = provider('fresh');
    let answerSlowly: ((providers: IdProvider[]) => void) | undefined;

    vi.mocked(fetchIdProviders)
      .mockReturnValueOnce(
        ResultAsync.fromSafePromise(
          new Promise<IdProvider[]>((resolve) => {
            answerSlowly = resolve;
          }),
        ),
      )
      .mockReturnValueOnce(ResultAsync.fromSafePromise(Promise.resolve([fresh])));

    const slowLoad = loadIdProviders();
    const fastLoad = loadIdProviders();
    await fastLoad;
    answerSlowly?.([stale]);
    await slowLoad;

    expect($idProviders.get().items).toEqual([fresh]);
  });
});
