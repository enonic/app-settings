import type { Group, Role, User } from '@enonic-types/core';

// TODO: [#8] Every fixture in this file goes away with the real transport. Until then it is the
// single source for who exists: an api segment spreads these constants and adds what its own
// subdomain carries — `{ ...SU, roles, groups }` is a `User` — so a key or a display name cannot
// drift between the section that owns a principal and the sections that only reference it.

export const SU: User = {
  type: 'user',
  key: 'user:system:su',
  displayName: 'Super User',
  login: 'su',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const JANE: User = {
  type: 'user',
  key: 'user:system:jane',
  displayName: 'Jane Doe',
  login: 'jane',
  email: 'jane.doe@example.com',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-07-02T11:30:00Z',
};

export const JOHN: User = {
  type: 'user',
  key: 'user:system:john',
  displayName: 'John Smith',
  login: 'john',
  email: 'john.smith@example.com',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-07-08T15:02:00Z',
};

export const ALICE: User = {
  type: 'user',
  key: 'user:ldap:alice',
  displayName: 'Alice Ward',
  login: 'alice',
  email: 'alice.ward@example.com',
  idProvider: 'ldap',
  hasPassword: false,
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const BOB: User = {
  type: 'user',
  key: 'user:ldap:bob',
  displayName: 'Bob Lang',
  login: 'bob',
  idProvider: 'ldap',
  hasPassword: false,
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const CAROL: User = {
  type: 'user',
  key: 'user:partners:carol',
  displayName: 'Carol Fisk',
  login: 'carol',
  email: 'carol.fisk@example.com',
  idProvider: 'partners',
  hasPassword: false,
  disabled: true,
  modifiedTime: '2026-07-25T16:10:00Z',
};

export const ERIK: User = {
  type: 'user',
  key: 'user:entraid:erik',
  displayName: 'Erik Holm',
  login: 'erik',
  email: 'erik.holm@example.com',
  idProvider: 'entraid',
  hasPassword: false,
  modifiedTime: '2026-07-28T09:30:00Z',
};

export const MAJA: User = {
  type: 'user',
  key: 'user:entraid:maja',
  displayName: 'Maja Lind',
  login: 'maja',
  email: 'maja.lind@example.com',
  idProvider: 'entraid',
  hasPassword: false,
  modifiedTime: '2026-07-28T09:30:00Z',
};

export const ADMINISTRATORS: Group = {
  type: 'group',
  key: 'group:system:administrators',
  displayName: 'Administrators',
  description: 'Users with full access',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const EDITORS: Group = {
  type: 'group',
  key: 'group:system:editors',
  displayName: 'Editors',
  description: 'Edits and publishes content',
  modifiedTime: '2026-07-14T14:41:00Z',
};

export const CONTRIBUTORS: Group = {
  type: 'group',
  key: 'group:system:contributors',
  displayName: 'Contributors',
  description: 'Writes content, publishes nothing',
  modifiedTime: '2026-07-14T14:41:00Z',
};

export const DEVELOPERS: Group = {
  type: 'group',
  key: 'group:ldap:developers',
  displayName: 'Developers',
  description: 'Deploys applications',
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const SUPPORT: Group = {
  type: 'group',
  key: 'group:partners:support',
  displayName: 'Support',
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const MARKETING: Group = {
  type: 'group',
  key: 'group:entraid:marketing',
  displayName: 'Marketing',
  description: 'Writes and publishes campaigns',
  modifiedTime: '2026-07-28T09:30:00Z',
};

export const ADMIN_ROLE: Role = {
  type: 'role',
  key: 'role:system.admin',
  displayName: 'Administrator',
  description: 'Full access to everything',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const ADMIN_LOGIN_ROLE: Role = {
  type: 'role',
  key: 'role:system.admin.login',
  displayName: 'Administration Console Login',
  description: 'Login to the administration console',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const AUTHENTICATED_ROLE: Role = {
  type: 'role',
  key: 'role:system.authenticated',
  displayName: 'Authenticated',
  description: 'Everyone who is logged in',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const EVERYONE_ROLE: Role = {
  type: 'role',
  key: 'role:system.everyone',
  displayName: 'Everyone',
  description: 'Everyone, logged in or not',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const USER_ADMIN_ROLE: Role = {
  type: 'role',
  key: 'role:system.user.admin',
  displayName: 'User Administrator',
  description: 'Manage users, groups and roles',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const CMS_ADMIN_ROLE: Role = {
  type: 'role',
  key: 'role:cms.admin',
  displayName: 'Content Manager Administrator',
  description: 'Full access to content and settings',
  modifiedTime: '2026-07-14T14:41:00Z',
};

export const CMS_EXPERT_ROLE: Role = {
  type: 'role',
  key: 'role:cms.expert',
  displayName: 'Content Manager Expert',
  description: 'Access to the source of a content',
  modifiedTime: '2026-07-14T14:41:00Z',
};

export const STORE_MANAGER_ROLE: Role = {
  type: 'role',
  key: 'role:store.manager',
  displayName: 'Store Manager',
  description: 'Manage products and orders',
  modifiedTime: '2026-07-21T08:05:00Z',
};
