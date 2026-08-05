import {
  findPrincipals,
  getMembers,
  getPrincipal,
  type Group,
  type Role,
  type User,
} from '/lib/xp/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRole, listRoleMembers, listRoles } from './role.source';

function role(key: string, displayName: string, overrides: Partial<Role> = {}): Role {
  return {
    type: 'role',
    key: key as Role['key'],
    displayName,
    modifiedTime: '2026-08-01T10:00:00Z',
    ...overrides,
  };
}

function found(hits: Role[]) {
  return { total: hits.length, count: hits.length, hits };
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

function group(key: string, displayName: string): Group {
  return {
    type: 'group',
    key: key as Group['key'],
    displayName,
    modifiedTime: '2026-08-01T10:00:00Z',
  };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('listRoles', () => {
  it('asks for every role rather than the default first ten', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([]));

    listRoles();

    expect(vi.mocked(findPrincipals)).toHaveBeenCalledWith({ type: 'role', count: -1 });
  });

  it('sorts by display name, ignoring case', () => {
    vi.mocked(findPrincipals).mockReturnValue(
      found([
        role('role:c', 'cms.admin'),
        role('role:a', 'Administrator'),
        role('role:b', 'browser'),
      ]),
    );

    expect(listRoles().map((found) => found.key)).toEqual(['role:a', 'role:b', 'role:c']);
  });

  it('sorts a role with no display name under the name from its key', () => {
    vi.mocked(findPrincipals).mockReturnValue(
      found([role('role:zulu', 'Zulu'), role('role:alpha', '')]),
    );

    expect(listRoles().map((found) => found.key)).toEqual(['role:alpha', 'role:zulu']);
  });

  it('drops a hit that is not a role, whatever the query asked for', () => {
    const hits = [role('role:a', 'Alpha'), user('user:system:su', 'Super User') as unknown as Role];
    vi.mocked(findPrincipals).mockReturnValue(found(hits));

    expect(listRoles().map((found) => found.key)).toEqual(['role:a']);
  });

  it('answers an empty list on an instance with no roles', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([]));

    expect(listRoles()).toEqual([]);
  });
});

describe('getRole', () => {
  it('answers the role a key names', () => {
    const admin = role('role:system.admin', 'Administrator');
    vi.mocked(getPrincipal).mockReturnValue(admin);

    expect(getRole('role:system.admin')).toBe(admin);
    expect(vi.mocked(getPrincipal)).toHaveBeenCalledWith('role:system.admin');
  });

  it('answers null for a key naming no role, without asking', () => {
    expect(getRole('group:system:administrators')).toBeNull();
    expect(getRole('role:with:a:colon')).toBeNull();
    expect(getRole('')).toBeNull();
    expect(vi.mocked(getPrincipal)).not.toHaveBeenCalled();
  });

  // ! The panel would otherwise be served a group's members as a role's: getPrincipal answers for
  // ! whatever the key names, and a caller can pass anything.
  it('answers null when the key names something that is not a role', () => {
    vi.mocked(getPrincipal).mockReturnValue(group('group:system:ops', 'Ops'));

    expect(getRole('role:ops')).toBeNull();
  });

  it('answers null for a role nothing answers to', () => {
    vi.mocked(getPrincipal).mockReturnValue(null);

    expect(getRole('role:gone')).toBeNull();
  });

  // ! PrincipalKey.ofRole throws on an id ID_VALIDATOR rejects rather than returning nothing, and a key
  // ! the platform will not parse names no role.
  it('answers null when the platform refuses the key', () => {
    vi.mocked(getPrincipal).mockImplementation(() => {
      throw new Error('Invalid role key');
    });

    expect(getRole('role:not valid')).toBeNull();
  });
});

describe('listRoleMembers', () => {
  it('reduces a member to the three fields a membership list shows', () => {
    vi.mocked(getMembers).mockReturnValue([user('user:system:su', 'Super User')]);

    expect(listRoleMembers('role:system.admin')).toEqual([
      { key: 'user:system:su', type: 'user', displayName: 'Super User' },
    ]);
  });

  it('reads the members of the role it was asked for', () => {
    vi.mocked(getMembers).mockReturnValue([]);

    listRoleMembers('role:cms.admin');

    expect(vi.mocked(getMembers)).toHaveBeenCalledWith('role:cms.admin');
  });

  it('keeps users and groups in one list, sorted by display name', () => {
    vi.mocked(getMembers).mockReturnValue([
      group('group:system:administrators', 'Administrators'),
      user('user:system:su', 'Super User'),
      group('group:system:contributors', 'contributors'),
    ]);

    expect(listRoleMembers('role:system.admin').map((member) => member.displayName)).toEqual([
      'Administrators',
      'contributors',
      'Super User',
    ]);
  });

  it('falls back to the name from the key for a member with no display name', () => {
    const nameless = { type: 'group', key: 'group:system:ops' } as unknown as Group;
    vi.mocked(getMembers).mockReturnValue([nameless]);

    expect(listRoleMembers('role:system.admin')[0]?.displayName).toBe('ops');
  });

  it('answers an empty list for a role nobody holds', () => {
    vi.mocked(getMembers).mockReturnValue([]);

    expect(listRoleMembers('role:system.admin')).toEqual([]);
  });
});
