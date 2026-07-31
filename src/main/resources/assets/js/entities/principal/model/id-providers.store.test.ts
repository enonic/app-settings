import { describe, expect, it } from 'vitest';

import { $idProviders, loadIdProviders } from './id-providers.store';

describe('loadIdProviders', () => {
  it('starts out loading with nothing to show', () => {
    expect($idProviders.get().status).toBe('loading');
    expect($idProviders.get().items).toEqual([]);
  });

  it('resolves to the providers the api returned', async () => {
    await loadIdProviders();

    const { status, items, error } = $idProviders.get();
    expect(status).toBe('ready');
    expect(items.length).toBeGreaterThan(0);
    expect(error).toBeUndefined();
  });

  it('carries the users of a provider, and leaves a provider bound to no application without a config', async () => {
    await loadIdProviders();

    const { items } = $idProviders.get();
    expect(items.find(({ key }) => key === 'system')?.users.length).toBeGreaterThan(0);
    expect(items.find(({ key }) => key === 'partners')?.idProviderConfig).toBeUndefined();
  });

  it('reports loading again while it reloads', async () => {
    await loadIdProviders();

    const seen: string[] = [];
    const unbind = $idProviders.subscribe(({ status }) => seen.push(status));
    await loadIdProviders();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });
});
