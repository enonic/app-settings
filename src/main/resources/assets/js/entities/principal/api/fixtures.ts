import type { Principal } from '../model/principal.types';

// TODO: [#8] Every fixture in this file goes away with the real transport; keeping them in one
// place means one file to delete rather than one per subdomain.

export const SU: Principal = {
  type: 'user',
  key: 'user:system:su',
  displayName: 'Super User',
  login: 'su',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const JANE: Principal = {
  type: 'user',
  key: 'user:system:jane',
  displayName: 'Jane Doe',
  login: 'jane',
  email: 'jane@example.com',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-07-02T11:30:00Z',
};

export const JOHN: Principal = {
  type: 'user',
  key: 'user:system:john',
  displayName: 'John Smith',
  login: 'john',
  email: 'john@example.com',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-07-08T15:02:00Z',
};

export const ALICE: Principal = {
  type: 'user',
  key: 'user:ldap:alice',
  displayName: 'Alice Ward',
  login: 'alice',
  idProvider: 'ldap',
  hasPassword: false,
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const BOB: Principal = {
  type: 'user',
  key: 'user:ldap:bob',
  displayName: 'Bob Lang',
  login: 'bob',
  idProvider: 'ldap',
  hasPassword: false,
  modifiedTime: '2026-07-19T07:45:00Z',
};

export const ADMINISTRATORS: Principal = {
  type: 'group',
  key: 'group:system:administrators',
  displayName: 'Administrators',
  description: 'Users with full access',
  modifiedTime: '2026-06-02T09:12:00Z',
};

export const CONTRIBUTORS: Principal = {
  type: 'group',
  key: 'group:system:contributors',
  displayName: 'Contributors',
  description: 'Writes content, publishes nothing',
  modifiedTime: '2026-07-14T14:41:00Z',
};
