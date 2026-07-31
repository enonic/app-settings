import { describe, expect, it } from 'vitest';

import type { User } from '../../../entities/principal';
import { filterUsers } from './users.filter';

function user(login: string, displayName: string, email?: string): User {
  return {
    type: 'user',
    key: `user:system:${login}`,
    displayName,
    login,
    email,
    idProvider: 'system',
    hasPassword: true,
    roles: [],
    groups: [],
  };
}

const jane = user('jane', 'Jane Doe', 'jane.doe@example.com');
const bob = user('bob', 'Bob Lang');
const users = [jane, bob];

describe('filterUsers', () => {
  it('returns every user for an empty or blank query', () => {
    expect(filterUsers(users, '')).toEqual(users);
    expect(filterUsers(users, '   ')).toEqual(users);
  });

  it('matches the display name whatever the case', () => {
    expect(filterUsers(users, 'JANE DOE')).toEqual([jane]);
  });

  it('matches the user name', () => {
    expect(filterUsers(users, 'bob')).toEqual([bob]);
  });

  it('matches the email', () => {
    expect(filterUsers(users, 'example.com')).toEqual([jane]);
  });

  it('survives a user without an email', () => {
    expect(filterUsers(users, 'lang')).toEqual([bob]);
  });

  it('ignores the user key', () => {
    expect(filterUsers(users, 'user:system')).toEqual([]);
  });

  it('leaves the users it was given alone', () => {
    const original = [...users];
    filterUsers(users, 'jane');

    expect(users).toEqual(original);
  });
});
