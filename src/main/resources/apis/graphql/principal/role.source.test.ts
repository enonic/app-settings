import {
  addMembers,
  createRole as createRolePrincipal,
  findPrincipals,
  getMembers,
  getPrincipal,
  modifyRole,
  removeMembers,
  type Group,
  type Role,
  type User,
} from '/lib/xp/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRole,
  getRole,
  listRoleMembers,
  listRoles,
  updateRole,
  type RoleInput,
} from './role.source';

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

describe('createRole', () => {
  function input(overrides: Partial<RoleInput> = {}): RoleInput {
    return { displayName: 'Editors', members: [], ...overrides };
  }

  it('creates the role from the name and the scalars given', () => {
    vi.mocked(createRolePrincipal).mockReturnValue(role('role:editors', 'Editors'));
    vi.mocked(getMembers).mockReturnValue([]);

    createRole('editors', input({ description: 'Edits things' }));

    expect(vi.mocked(createRolePrincipal)).toHaveBeenCalledWith({
      name: 'editors',
      displayName: 'Editors',
      description: 'Edits things',
    });
  });

  it('gives the new role every member listed', () => {
    vi.mocked(createRolePrincipal).mockReturnValue(role('role:editors', 'Editors'));
    vi.mocked(getMembers).mockReturnValue([]);

    createRole('editors', input({ members: ['user:system:su', 'group:system:ops'] }));

    expect(vi.mocked(addMembers)).toHaveBeenCalledWith('role:editors', [
      'user:system:su',
      'group:system:ops',
    ]);
  });

  it('touches no membership for a role created with nobody in it', () => {
    vi.mocked(createRolePrincipal).mockReturnValue(role('role:editors', 'Editors'));
    vi.mocked(getMembers).mockReturnValue([]);

    createRole('editors', input());

    expect(vi.mocked(addMembers)).not.toHaveBeenCalled();
    expect(vi.mocked(removeMembers)).not.toHaveBeenCalled();
  });

  it('answers the role the platform created', () => {
    const created = role('role:editors', 'Editors');
    vi.mocked(createRolePrincipal).mockReturnValue(created);
    vi.mocked(getMembers).mockReturnValue([]);

    expect(createRole('editors', input())).toBe(created);
  });
});

describe('updateRole', () => {
  function input(overrides: Partial<RoleInput> = {}): RoleInput {
    return { displayName: 'Editors', members: [], ...overrides };
  }

  function modifiable(key: string) {
    vi.mocked(modifyRole).mockImplementation(({ editor }) =>
      editor(role(key, 'Whatever', { description: 'Before' })),
    );
  }

  it('writes the scalars through the editor the platform hands it', () => {
    modifiable('role:editors');
    vi.mocked(getMembers).mockReturnValue([]);

    const updated = updateRole(
      'role:editors',
      input({ displayName: 'Content editors', description: 'After' }),
    );

    expect(updated.displayName).toBe('Content editors');
    expect(updated.description).toBe('After');
  });

  // ! The empty string is the only way to clear one: `ModifyRoleHandler` assigns a field only when the
  // ! editor returned a non-null value, so `undefined` would leave the old description in place.
  it('clears a description the edit dropped, with an empty string rather than nothing', () => {
    modifiable('role:editors');
    vi.mocked(getMembers).mockReturnValue([]);

    expect(updateRole('role:editors', input()).description).toBe('');
  });

  // ! The whole list arrives, so the difference is the server's to work out — the client never sends
  // ! an add-list and a remove-list.
  it('adds what the list gained and removes what it lost', () => {
    modifiable('role:editors');
    vi.mocked(getMembers).mockReturnValue([
      user('user:system:su', 'Super User'),
      group('group:system:ops', 'Ops'),
    ]);

    updateRole('role:editors', input({ members: ['user:system:su', 'group:system:writers'] }));

    expect(vi.mocked(addMembers)).toHaveBeenCalledWith('role:editors', ['group:system:writers']);
    expect(vi.mocked(removeMembers)).toHaveBeenCalledWith('role:editors', ['group:system:ops']);
  });

  it('asks for no membership change when the list is unchanged', () => {
    modifiable('role:editors');
    vi.mocked(getMembers).mockReturnValue([user('user:system:su', 'Super User')]);

    updateRole('role:editors', input({ members: ['user:system:su'] }));

    expect(vi.mocked(addMembers)).not.toHaveBeenCalled();
    expect(vi.mocked(removeMembers)).not.toHaveBeenCalled();
  });

  it('empties a role whose member list arrives empty', () => {
    modifiable('role:editors');
    vi.mocked(getMembers).mockReturnValue([user('user:system:su', 'Super User')]);

    updateRole('role:editors', input({ members: [] }));

    expect(vi.mocked(removeMembers)).toHaveBeenCalledWith('role:editors', ['user:system:su']);
  });

  // ! Losing `su` from Administrators locks the last way back into the tool, and the platform allows it.
  it('refuses to take the super user out of the administrators role', () => {
    modifiable('role:system.admin');
    vi.mocked(getMembers).mockReturnValue([user('user:system:su', 'Super User')]);

    expect(() => updateRole('role:system.admin', input({ members: [] }))).toThrow(
      'Cannot remove [user:system:su] from [role:system.admin]',
    );
    expect(vi.mocked(removeMembers)).not.toHaveBeenCalled();
  });

  it('lets the administrators role change in every other way', () => {
    modifiable('role:system.admin');
    vi.mocked(getMembers).mockReturnValue([user('user:system:su', 'Super User')]);

    updateRole('role:system.admin', input({ members: ['user:system:su', 'group:system:ops'] }));

    expect(vi.mocked(addMembers)).toHaveBeenCalledWith('role:system.admin', ['group:system:ops']);
  });

  it('fails for a role nothing answers to any more', () => {
    vi.mocked(modifyRole).mockReturnValue(null);

    expect(() => updateRole('role:gone', input())).toThrow('No role answers to [role:gone]');
    expect(vi.mocked(getMembers)).not.toHaveBeenCalled();
  });
});
