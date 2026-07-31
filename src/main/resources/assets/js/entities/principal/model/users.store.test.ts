import { describe, expect, it } from 'vitest';

import { $users, loadUsers } from './users.store';

describe('loadUsers', () => {
  it('starts out loading with nothing to show', () => {
    expect($users.get().status).toBe('loading');
    expect($users.get().items).toEqual([]);
  });

  it('resolves to the users the api returned', async () => {
    await loadUsers();

    const { status, items, error } = $users.get();
    expect(status).toBe('ready');
    expect(items.length).toBeGreaterThan(0);
    expect(error).toBeUndefined();
  });

  it('carries the roles and the groups of a user', async () => {
    await loadUsers();

    const su = $users.get().items.find(({ login }) => login === 'su');
    expect(su?.roles.length).toBeGreaterThan(0);
    expect(su?.groups.length).toBeGreaterThan(0);
  });

  it('reports loading again while it reloads', async () => {
    await loadUsers();

    const seen: string[] = [];
    const unbind = $users.subscribe(({ status }) => seen.push(status));
    await loadUsers();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });
});
