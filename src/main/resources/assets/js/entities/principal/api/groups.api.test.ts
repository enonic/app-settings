import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { fetchGroupDetail, GROUPS_ROOT, toGroups } from './groups.api';

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
      installUrl: '/_/server:app/installUrl',
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

function wireGroup(overrides: Record<string, unknown> = {}) {
  return {
    key: 'group:system:administrators',
    displayName: 'Administrators',
    description: 'The admins',
    ...overrides,
  };
}

describe('GROUPS_ROOT', () => {
  // ! Two calls per group, `getMembers` plus `getMemberships`, and neither has a count to ask for instead.
  // ! Groups are the half of this that could not wait: roles are bounded, groups are not.
  it('asks for neither members nor roles', () => {
    expect(GROUPS_ROOT.selection).not.toContain('members');
    expect(GROUPS_ROOT.selection).not.toContain('roles');
  });
});

describe('toGroups', () => {
  it('maps the wire payload to the domain group', () => {
    expect(toGroups([wireGroup()])).toEqual([
      {
        type: 'group',
        key: 'group:system:administrators',
        displayName: 'Administrators',
        description: 'The admins',
      },
    ]);
  });

  it('reports a null description as absent', () => {
    const [group] = toGroups([wireGroup({ description: null })]);

    expect(group?.description).toBeUndefined();
  });

  it('reports an empty description as absent, so the panel omits the field', () => {
    const [group] = toGroups([wireGroup({ description: '' })]);

    expect(group?.description).toBeUndefined();
  });

  it('answers an empty list when the instance carries no groups', () => {
    expect(toGroups([])).toEqual([]);
  });
});

describe('fetchGroupDetail', () => {
  beforeEach(() => {
    setConfig(config);
    sent = undefined;
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('asks by key through a variable, never through the query text', async () => {
    respondWith({ data: { group: { ...wireGroup(), members: [], roles: [] } } });

    await fetchGroupDetail('group:system:administrators');

    expect(sent?.variables).toEqual({ key: 'group:system:administrators' });
    expect(sent?.query).not.toContain('group:system:administrators');
  });

  it('maps the members and the roles separately', async () => {
    respondWith({
      data: {
        group: {
          ...wireGroup(),
          members: [{ key: 'user:system:su', type: 'user', displayName: 'Super User' }],
          roles: [{ key: 'role:system.admin', type: 'role', displayName: 'Administrator' }],
        },
      },
    });

    const group = (await fetchGroupDetail('group:system:administrators'))._unsafeUnwrap();

    expect(group?.members).toEqual([
      { key: 'user:system:su', type: 'user', displayName: 'Super User' },
    ]);
    expect(group?.roles).toEqual([
      { key: 'role:system.admin', type: 'role', displayName: 'Administrator' },
    ]);
  });

  it('answers nothing for a key no group answers to', async () => {
    respondWith({ data: { group: null } });

    const result = await fetchGroupDetail('group:system:gone');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeUndefined();
  });

  it('fails when the field could not be read', async () => {
    respondWith({ errors: [{ message: 'Memberships are unreadable' }] });

    const result = await fetchGroupDetail('group:system:administrators');

    expect(result.isErr()).toBe(true);
  });
});
