import { ResultAsync } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';

import { fetchRoles } from '../api/roles.api';
import type { Role } from './principal.types';
import { $roles, loadRoles } from './roles.store';

// The real fixture answers immediately, which cannot show a slow answer losing to a fast one.
vi.mock('../api/roles.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/roles.api')>();
  return { ...actual, fetchRoles: vi.fn(actual.fetchRoles) };
});

function role(key: string): Role {
  return {
    type: 'role',
    key: `role:${key}`,
    displayName: key,
    modifiedTime: '2026-07-21T08:05:00Z',
    members: [],
  };
}

describe('loadRoles', () => {
  it('starts out loading with nothing to show', () => {
    expect($roles.get().status).toBe('loading');
    expect($roles.get().items).toEqual([]);
  });

  it('resolves to the roles the api returned', async () => {
    await loadRoles();

    const { status, items, error } = $roles.get();
    expect(status).toBe('ready');
    expect(items.length).toBeGreaterThan(0);
    expect(error).toBeUndefined();
  });

  it('reports loading again while it reloads', async () => {
    await loadRoles();

    const seen: string[] = [];
    const unbind = $roles.subscribe(({ status }) => seen.push(status));
    await loadRoles();
    unbind();

    expect(seen).toEqual(['ready', 'loading', 'ready']);
  });

  it('drops the answer of the load a newer one replaced', async () => {
    const stale = role('stale');
    const fresh = role('fresh');
    let answerSlowly: ((roles: Role[]) => void) | undefined;

    vi.mocked(fetchRoles)
      .mockReturnValueOnce(
        ResultAsync.fromSafePromise(
          new Promise<Role[]>((resolve) => {
            answerSlowly = resolve;
          }),
        ),
      )
      .mockReturnValueOnce(ResultAsync.fromSafePromise(Promise.resolve([fresh])));

    const slowLoad = loadRoles();
    const fastLoad = loadRoles();
    await fastLoad;
    answerSlowly?.([stale]);
    await slowLoad;

    expect($roles.get().items).toEqual([fresh]);
  });
});
