import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { fetchRoleDetail, ROLES_ROOT, toRoles } from './roles.api';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    events: 'ws:/_/admin:event',
    graphql: '/_/app:graphql',
    serverApp: {
      start: '/_/server:app/start',
      stop: '/_/server:app/stop',
      uninstall: '/_/server:app/uninstall',
    },
  },
} satisfies ToolConfig;

let sent: { query?: string; variables?: unknown } | undefined;

function respondWith(body: unknown): void {
  globalThis.fetch = vi.fn((_url: unknown, options?: { body?: string }) => {
    sent = JSON.parse(options?.body ?? '{}') as { query?: string; variables?: unknown };
    return Promise.resolve(new Response(JSON.stringify(body)));
  }) as unknown as typeof globalThis.fetch;
}

function wireRole(overrides: Record<string, unknown> = {}) {
  return {
    key: 'role:system.admin',
    displayName: 'Administrator',
    description: 'Full access',
    modifiedTime: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

describe('ROLES_ROOT', () => {
  // ! The regression this split exists to prevent: one getMembers per role, for a list that renders a name
  // ! and a description. The field is off `Role` in the schema too, so a selection asking for it now fails
  // ! rather than costs — but the list is where it would be reintroduced.
  it('asks for no member list', () => {
    expect(ROLES_ROOT.selection).not.toContain('members');
  });
});

describe('toRoles', () => {
  it('maps the wire payload to the domain role', () => {
    expect(toRoles([wireRole()])).toEqual([
      {
        type: 'role',
        key: 'role:system.admin',
        displayName: 'Administrator',
        description: 'Full access',
        modifiedTime: '2026-08-01T10:00:00Z',
      },
    ]);
  });

  it('reports a null description and modified time as absent', () => {
    const [role] = toRoles([wireRole({ description: null, modifiedTime: null })]);

    expect(role?.description).toBeUndefined();
    expect(role?.modifiedTime).toBeUndefined();
  });

  it('reports an empty description as absent, so the panel omits the field', () => {
    const [role] = toRoles([wireRole({ description: '' })]);

    expect(role?.description).toBeUndefined();
  });

  it('answers an empty list when the instance carries no roles', () => {
    expect(toRoles([])).toEqual([]);
  });
});

describe('fetchRoleDetail', () => {
  beforeEach(() => {
    setConfig(config);
    sent = undefined;
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('asks by key through a variable, never through the query text', async () => {
    respondWith({ data: { role: { ...wireRole(), members: [] } } });

    await fetchRoleDetail('role:system.admin');

    expect(sent?.variables).toEqual({ key: 'role:system.admin' });
    expect(sent?.query).not.toContain('role:system.admin');
  });

  it('carries members through as the three fields a membership row shows', async () => {
    respondWith({
      data: {
        role: {
          ...wireRole(),
          members: [
            { key: 'user:system:su', type: 'user', displayName: 'Super User' },
            { key: 'group:system:administrators', type: 'group', displayName: 'Administrators' },
          ],
        },
      },
    });

    const role = (await fetchRoleDetail('role:system.admin'))._unsafeUnwrap();

    expect(role?.displayName).toBe('Administrator');
    expect(role?.members).toEqual([
      { key: 'user:system:su', type: 'user', displayName: 'Super User' },
      { key: 'group:system:administrators', type: 'group', displayName: 'Administrators' },
    ]);
  });

  it('answers an empty member list for a role nobody holds', async () => {
    respondWith({ data: { role: { ...wireRole(), members: [] } } });

    const role = (await fetchRoleDetail('role:system.admin'))._unsafeUnwrap();

    expect(role?.members).toEqual([]);
  });

  // ! Null is an answer, not a failure: the key names no role, so there is nothing to show. Failing here
  // ! would make a deleted role read as a broken panel.
  it('answers nothing for a key no role answers to', async () => {
    respondWith({ data: { role: null } });

    const result = await fetchRoleDetail('role:gone');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeUndefined();
  });

  it('fails when the field could not be read', async () => {
    respondWith({ errors: [{ message: 'Members are unreadable' }] });

    const result = await fetchRoleDetail('role:system.admin');

    expect(result.isErr()).toBe(true);
  });
});
