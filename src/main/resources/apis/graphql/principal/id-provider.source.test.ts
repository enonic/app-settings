import {
  findPrincipals,
  getIdProviders,
  type Group,
  type IdProvider,
  type User,
} from '/lib/xp/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  countPrincipals,
  listIdProviders,
  listPrincipals,
  principalSetOf,
} from './id-provider.source';

function provider(
  key: string,
  displayName: string,
  overrides: Partial<IdProvider> = {},
): IdProvider {
  return { key, displayName, ...overrides };
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

function found(hits: (User | Group)[], total = hits.length) {
  return { total, count: hits.length, hits };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('listIdProviders', () => {
  it('sorts by display name, ignoring case', () => {
    vi.mocked(getIdProviders).mockReturnValue([
      provider('c', 'company directory'),
      provider('a', 'Archive'),
      provider('b', 'Backup'),
    ]);

    expect(listIdProviders().map(({ key }) => key)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the key for a provider with no display name', () => {
    const nameless = { key: 'partners' } as unknown as IdProvider;
    vi.mocked(getIdProviders).mockReturnValue([provider('zulu', 'Zulu'), nameless]);

    expect(listIdProviders().map(({ key }) => key)).toEqual(['partners', 'zulu']);
  });

  it('answers an empty list on an instance with no providers', () => {
    vi.mocked(getIdProviders).mockReturnValue([]);

    expect(listIdProviders()).toEqual([]);
  });
});

describe('principalSetOf', () => {
  it('carries the provider and the kind, resolving nothing on its own', () => {
    expect(principalSetOf('system', 'user')).toEqual({ idProvider: 'system', type: 'user' });
    expect(vi.mocked(findPrincipals)).not.toHaveBeenCalled();
  });
});

describe('countPrincipals', () => {
  it('asks the search for the total and no rows at all', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([], 4213));

    expect(countPrincipals({ idProvider: 'ldap', type: 'user' })).toBe(4213);
    expect(vi.mocked(findPrincipals)).toHaveBeenCalledWith({
      type: 'user',
      idProvider: 'ldap',
      count: 0,
    });
  });

  it('answers zero for a provider holding none of that kind', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([], 0));

    expect(countPrincipals({ idProvider: 'partners', type: 'group' })).toBe(0);
  });
});

describe('listPrincipals', () => {
  it('asks for every row of the kind it was given', () => {
    vi.mocked(findPrincipals).mockReturnValue(found([]));

    listPrincipals({ idProvider: 'system', type: 'group' });

    expect(vi.mocked(findPrincipals)).toHaveBeenCalledWith({
      type: 'group',
      idProvider: 'system',
      count: -1,
    });
  });

  it('reduces each principal to the three fields a membership row shows, sorted by name', () => {
    vi.mocked(findPrincipals).mockReturnValue(
      found([user('user:system:zoe', 'Zoe'), group('group:system:admins', 'Administrators')]),
    );

    expect(listPrincipals({ idProvider: 'system', type: 'user' })).toEqual([
      { key: 'group:system:admins', type: 'group', displayName: 'Administrators' },
      { key: 'user:system:zoe', type: 'user', displayName: 'Zoe' },
    ]);
  });

  it('falls back to the name from the key when a principal carries no display name', () => {
    const nameless = { type: 'user', key: 'user:system:ghost' } as unknown as User;
    vi.mocked(findPrincipals).mockReturnValue(found([nameless]));

    expect(listPrincipals({ idProvider: 'system', type: 'user' })[0]?.displayName).toBe('ghost');
  });
});
