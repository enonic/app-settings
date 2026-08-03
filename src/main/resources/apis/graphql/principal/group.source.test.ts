import {
  findPrincipals,
  getMembers,
  getMemberships,
  type Group,
  type Role,
  type User,
} from '/lib/xp/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listGroupMembers, listGroupRoles, listGroups } from './group.source';

function group(key: string, displayName: string): Group {
  return {
    type: 'group',
    key: key as Group['key'],
    displayName,
    modifiedTime: '2026-08-01T10:00:00Z',
  };
}

function user(key: string, displayName: string): User {
  return {
    type: 'user',
    key: key as User['key'],
    displayName,
    login: displayName,
    idProvider: 'system',
    hasPassword: true,
  };
}

function role(key: string, displayName: string): Role {
  return {
    type: 'role',
    key: key as Role['key'],
    displayName,
    modifiedTime: '2026-08-01T10:00:00Z',
  };
}

function found(hits: Group[]) {
  return { total: hits.length, count: hits.length, hits };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('listGroups', () => {
  it('asks for every group rather than the default first ten', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([]));

    listGroups();

    expect(vi.mocked(findPrincipals)).toHaveBeenCalledWith({ type: 'group', count: -1 });
  });

  it('sorts by display name, ignoring case', () => {
    vi.mocked(findPrincipals).mockReturnValue(
      found([
        group('group:system:c', 'contributors'),
        group('group:system:a', 'Administrators'),
        group('group:system:b', 'Backup'),
      ]),
    );

    expect(listGroups().map(({ key }) => key)).toEqual([
      'group:system:a',
      'group:system:b',
      'group:system:c',
    ]);
  });

  it('drops a hit that is not a group, whatever the query asked for', () => {
    const hits = [
      group('group:system:a', 'Admins'),
      user('user:system:su', 'Super User') as unknown as Group,
    ];
    vi.mocked(findPrincipals).mockReturnValue(found(hits));

    expect(listGroups().map(({ key }) => key)).toEqual(['group:system:a']);
  });

  it('answers an empty list on an instance with no groups', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([]));

    expect(listGroups()).toEqual([]);
  });
});

describe('listGroupMembers', () => {
  it('reads the members of the group it was asked for', () => {
    vi.mocked(getMembers).mockReturnValue([]);

    listGroupMembers('group:system:admins');

    expect(vi.mocked(getMembers)).toHaveBeenCalledWith('group:system:admins');
  });

  it('keeps users and nested groups in one flat list, sorted by display name', () => {
    vi.mocked(getMembers).mockReturnValue([
      user('user:system:zoe', 'Zoe'),
      group('group:system:editors', 'Editors'),
    ]);

    expect(listGroupMembers('group:system:admins')).toEqual([
      { key: 'group:system:editors', type: 'group', displayName: 'Editors' },
      { key: 'user:system:zoe', type: 'user', displayName: 'Zoe' },
    ]);
  });

  it('answers an empty list for a group nobody is in', () => {
    vi.mocked(getMembers).mockReturnValue([]);

    expect(listGroupMembers('group:system:admins')).toEqual([]);
  });
});

describe('listGroupRoles', () => {
  it('keeps the roles and drops the parent groups a membership also carries', () => {
    vi.mocked(getMemberships).mockReturnValue([
      role('role:system.admin', 'Administrator'),
      group('group:system:staff', 'Staff'),
    ]);

    expect(listGroupRoles('group:system:admins')).toEqual([
      { key: 'role:system.admin', type: 'role', displayName: 'Administrator' },
    ]);
  });

  it('sorts by display name, ignoring case', () => {
    vi.mocked(getMemberships).mockReturnValue([
      role('role:b', 'browser'),
      role('role:a', 'Administrator'),
    ]);

    expect(listGroupRoles('group:system:admins').map(({ key }) => key)).toEqual([
      'role:a',
      'role:b',
    ]);
  });

  it('answers an empty list for a group holding no role', () => {
    vi.mocked(getMemberships).mockReturnValue([group('group:system:staff', 'Staff')]);

    expect(listGroupRoles('group:system:admins')).toEqual([]);
  });
});
