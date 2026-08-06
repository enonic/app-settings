import {
  findUsers,
  getMemberships,
  getPrincipal,
  getProfile,
  type Group,
  type Role,
  type User,
} from '/lib/xp/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  escapeQueryValue,
  getUser,
  listUserGroups,
  listUserPublicKeys,
  listUserRoles,
  listUsers,
} from './user.source';

function user(name: string, displayName: string): User {
  return {
    type: 'user',
    key: `user:system:${name}` as User['key'],
    displayName,
    login: name,
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

function role(key: string, displayName: string): Role {
  return {
    type: 'role',
    key: key as Role['key'],
    displayName,
    modifiedTime: '2026-08-01T10:00:00Z',
  };
}

function found(hits: User[], total = hits.length) {
  return { total, count: hits.length, hits };
}

/** The single argument `findUsers` was called with. */
function calledWith() {
  return vi.mocked(findUsers).mock.calls[0]?.[0];
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('listUsers', () => {
  it('answers with the page and the size of the whole match', () => {
    vi.mocked(findUsers).mockReturnValue(found([user('alice', 'Alice Ward')], 137));

    expect(listUsers({ start: 0, count: 50 })).toEqual({
      total: 137,
      hits: [user('alice', 'Alice Ward')],
    });
  });

  it('pages from where it was asked to', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ start: 100, count: 50 });

    expect(calledWith()?.start).toBe(100);
    expect(calledWith()?.count).toBe(50);
  });

  it('asks for fifty when no page size was given', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({});

    expect(calledWith()?.count).toBe(50);
  });

  it('caps the page size, whatever it was asked for', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ count: 100000 });

    expect(calledWith()?.count).toBe(100);
  });

  // ! An upper bound alone would let this through: `count: -1` is `GET_ALL_SIZE_FLAG`, so `findUsers`
  // ! would read the whole directory inside the app's one JS thread.
  it('refuses a negative page size rather than reading every user', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ count: -1 });

    expect(calledWith()?.count).toBe(0);
  });

  // Zero is not a mistake: it asks for the total and no rows at all.
  it('passes a zero page size through, since it is a count without rows', () => {
    vi.mocked(findUsers).mockReturnValue(found([], 137));

    expect(listUsers({ count: 0 })).toEqual({ total: 137, hits: [] });
    expect(calledWith()?.count).toBe(0);
  });

  // ! Elasticsearch refuses `from + size` past its result window and `SecurityServiceImpl` does not catch
  // ! it, so an unclamped offset blanks the whole list rather than ending the paging.
  it('stops paging at the result window rather than letting the search fail', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ start: 50_000, count: 50 });

    expect(calledWith()?.start).toBe(9900);
  });

  // ! The two clamps are one rule: `from + size` must stay inside the result window, so raising the page
  // ! size without lowering the reach would breach it again.
  it('keeps the furthest page inside the result window', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ start: 50_000, count: 50_000 });

    const asked = calledWith();
    expect((asked?.start ?? 0) + (asked?.count ?? 0)).toBeLessThanOrEqual(10_000);
  });

  it('refuses a negative offset', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ start: -10 });

    expect(calledWith()?.start).toBe(0);
  });

  it('searches with no constraint at all when nothing narrows it', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({});

    expect(calledWith()?.query).toBe('');
  });

  it('searches display name and all text, whole words or a typed prefix', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ search: 'alice' });

    expect(calledWith()?.query).toBe(
      '(fulltext("_allText,displayName","alice","AND") OR ngram("_allText,displayName","alice","AND"))',
    );
  });

  it('ignores a blank search', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ search: '   ' });

    expect(calledWith()?.query).toBe('');
  });

  it('filters by provider through the node property that carries it', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ idProviders: ['ldap'] });

    expect(calledWith()?.query).toBe('userStoreKey="ldap"');
  });

  it('ORs several providers, so the filter can tick more than one', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ idProviders: ['ldap', 'system'] });

    expect(calledWith()?.query).toBe('(userStoreKey="ldap" OR userStoreKey="system")');
  });

  it('ignores an empty provider list', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ idProviders: [] });

    expect(calledWith()?.query).toBe('');
  });

  it('combines a search and a provider filter', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ search: 'alice', idProviders: ['ldap'] });

    expect(calledWith()?.query).toBe(
      '(fulltext("_allText,displayName","alice","AND") OR ngram("_allText,displayName","alice","AND")) AND userStoreKey="ldap"',
    );
  });

  // ! A typed quote used to be enough to break the query on app-users. It has to reach the parser as a
  // ! literal, not as the end of one.
  it('escapes a quote in the search rather than ending the literal', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ search: 'say "hi"' });

    expect(calledWith()?.query).toContain('"say \\"hi\\""');
  });

  it('escapes the provider filter too, not only the search', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ idProviders: ['od"d'] });

    expect(calledWith()?.query).toBe('userStoreKey="od\\"d"');
  });

  // ! The tie-break has to be a field that is actually written and unique, or paging is unsound: an
  // ! unwritten property is silently ignored by the sort, and `_name` repeats across providers.
  it('orders by display name, with the node path breaking ties', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({ sort: 'displayNameAsc' });
    expect(calledWith()?.sort).toBe('displayName ASC, _path ASC');

    vi.resetAllMocks();
    vi.mocked(findUsers).mockReturnValue(found([]));
    listUsers({ sort: 'displayNameDesc' });
    expect(calledWith()?.sort).toBe('displayName DESC, _path ASC');
  });

  it('orders by display name ascending when nothing was asked for', () => {
    vi.mocked(findUsers).mockReturnValue(found([]));

    listUsers({});

    expect(calledWith()?.sort).toBe('displayName ASC, _path ASC');
  });
});

describe('escapeQueryValue', () => {
  it('escapes a double quote', () => {
    expect(escapeQueryValue('say "hi"')).toBe('say \\"hi\\"');
  });

  it('escapes a backslash before the quotes, so an escape is not escaped twice', () => {
    expect(escapeQueryValue('c:\\path "x"')).toBe('c:\\\\path \\"x\\"');
  });

  it('leaves an ordinary value alone', () => {
    expect(escapeQueryValue('alice ward')).toBe('alice ward');
  });
});

describe('getUser', () => {
  it('answers with the user a key names', () => {
    vi.mocked(getPrincipal).mockReturnValue(user('alice', 'Alice Ward'));

    expect(getUser('user:system:alice')).toEqual(user('alice', 'Alice Ward'));
  });

  it('answers null for a key no user holds, which is not a failure', () => {
    vi.mocked(getPrincipal).mockReturnValue(null);

    expect(getUser('user:system:nobody')).toBeNull();
  });

  // ! `getPrincipal` answers for whatever a key names, so without a shape check a group would be served
  // ! as a user and its memberships read as that user's.
  it('answers null for a key that names something other than a user, without asking', () => {
    expect(getUser('group:system:editors')).toBeNull();
    expect(getUser('role:system.admin')).toBeNull();
    expect(vi.mocked(getPrincipal)).not.toHaveBeenCalled();
  });

  // ! `PrincipalKey.from` throws on a key it cannot parse, so an unchecked one would surface as a failed
  // ! request instead of nothing found — `/users/garbage` is reachable from the address bar.
  it('answers null for a malformed key rather than letting the platform throw', () => {
    expect(getUser('garbage')).toBeNull();
    expect(getUser('user:system:alice:extra')).toBeNull();
    expect(getUser('')).toBeNull();
    expect(vi.mocked(getPrincipal)).not.toHaveBeenCalled();
  });

  // ! The shape check is only a superset of what XP accepts — `ID_VALIDATOR` also rejects spaces and HTML
  // ! specials, and does it by throwing. A key that gets past the pattern and dies in the platform still
  // ! has to read as "no such user".
  it('answers null for a key the platform itself refuses to parse', () => {
    vi.mocked(getPrincipal).mockImplementation(() => {
      throw new Error('Invalid principal id: al ice');
    });

    expect(getUser('user:system:al ice')).toBeNull();
  });
});

describe('listUserRoles and listUserGroups', () => {
  // ! Direct memberships only would show `Roles (0)` for an administrator who holds the role through
  // ! `system:administrators`, which is how administrators are normally made.
  it('asks for transitive memberships, so a role held through a group counts', () => {
    vi.mocked(getMemberships).mockReturnValue([]);

    listUserRoles('user:system:alice' as User['key']);

    expect(vi.mocked(getMemberships)).toHaveBeenCalledWith('user:system:alice', true);
  });

  it('splits the memberships and sorts each by display name', () => {
    vi.mocked(getMemberships).mockReturnValue([
      role('role:system.admin', 'Administrator'),
      group('group:system:editors', 'Editors'),
      group('group:system:contributors', 'Contributors'),
    ]);

    expect(listUserRoles('user:system:alice' as User['key']).map(({ key }) => key)).toEqual([
      'role:system.admin',
    ]);
    expect(
      listUserGroups('user:system:alice' as User['key']).map(({ displayName }) => displayName),
    ).toEqual(['Contributors', 'Editors']);
  });

  it('answers empty for a user in nothing', () => {
    vi.mocked(getMemberships).mockReturnValue([]);

    expect(listUserRoles('user:system:alice' as User['key'])).toEqual([]);
  });
});

describe('listUserPublicKeys', () => {
  it('answers empty for a profile that carries none', () => {
    vi.mocked(getProfile).mockReturnValue({});

    expect(listUserPublicKeys('user:system:alice')).toEqual([]);
  });

  it('answers empty for a user with no profile at all', () => {
    vi.mocked(getProfile).mockReturnValue(null);

    expect(listUserPublicKeys('user:system:alice')).toEqual([]);
  });

  it('wraps a single key, which the profile does not store as an array', () => {
    const key = { kid: 'abc', label: 'Laptop' };
    vi.mocked(getProfile).mockReturnValue({ publicKeys: key });

    expect(listUserPublicKeys('user:system:alice')).toEqual([key]);
  });

  it('passes several through in order', () => {
    const keys = [{ kid: 'abc' }, { kid: 'def' }];
    vi.mocked(getProfile).mockReturnValue({ publicKeys: keys });

    expect(listUserPublicKeys('user:system:alice')).toEqual(keys);
  });
});
