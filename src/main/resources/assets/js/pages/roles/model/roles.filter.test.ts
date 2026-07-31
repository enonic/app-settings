import { describe, expect, it } from 'vitest';

import type { Role } from '../../../entities/principal';
import { filterRoles } from './roles.filter';

const admin: Role = {
  type: 'role',
  key: 'role:system.admin',
  displayName: 'Administrator',
  description: 'Full access to everything',
  modifiedTime: '2026-07-21T08:05:00Z',
  members: [],
};

const store: Role = {
  type: 'role',
  key: 'role:store.manager',
  displayName: 'Store Manager',
  description: 'Manage products and orders',
  modifiedTime: '2026-07-21T08:05:00Z',
  members: [],
};

const nameless: Role = {
  type: 'role',
  key: 'role:cms.expert',
  displayName: 'Expert',
  modifiedTime: '2026-07-21T08:05:00Z',
  members: [],
};

const roles = [admin, store, nameless];

describe('filterRoles', () => {
  it('returns every role for an empty or blank query', () => {
    expect(filterRoles(roles, '')).toEqual(roles);
    expect(filterRoles(roles, '   ')).toEqual(roles);
  });

  it('matches the display name whatever the case', () => {
    expect(filterRoles(roles, 'store')).toEqual([store]);
    expect(filterRoles(roles, 'ADMINISTRATOR')).toEqual([admin]);
  });

  it('matches the description too', () => {
    expect(filterRoles(roles, 'orders')).toEqual([store]);
  });

  it('matches on part of a word', () => {
    expect(filterRoles(roles, 'admin')).toEqual([admin]);
  });

  it('survives a role without a description', () => {
    expect(filterRoles(roles, 'expert')).toEqual([nameless]);
  });

  it('ignores the role key', () => {
    expect(filterRoles(roles, 'system.admin')).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterRoles(roles, 'nope')).toEqual([]);
  });

  it('leaves the roles it was given alone', () => {
    const original = [...roles];
    filterRoles(roles, 'store');

    expect(roles).toEqual(original);
  });
});
