import { describe, expect, it } from 'vitest';

import { $groups, loadGroups } from './groups.store';

describe('loadGroups', () => {
  it('starts out loading with nothing to show', () => {
    expect($groups.get().status).toBe('loading');
    expect($groups.get().items).toEqual([]);
  });

  it('resolves to the groups the api returned', async () => {
    await loadGroups();

    const { status, items, error } = $groups.get();
    expect(status).toBe('ready');
    expect(items.length).toBeGreaterThan(0);
    expect(error).toBeUndefined();
  });

  it('carries the members and the roles of a group', async () => {
    await loadGroups();

    const administrators = $groups.get().items.find(({ key }) => key.endsWith(':administrators'));
    expect(administrators?.members.length).toBeGreaterThan(0);
    expect(administrators?.roles.length).toBeGreaterThan(0);
  });

  it('reports loading again while it reloads', async () => {
    await loadGroups();

    const seen: string[] = [];
    const unbind = $groups.subscribe(({ status }) => seen.push(status));
    await loadGroups();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });
});
