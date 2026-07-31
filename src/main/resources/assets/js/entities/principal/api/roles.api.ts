import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { Group, Role, User } from '../model/principal.types';

const SU: User = {
  type: 'user',
  key: 'user:system:su',
  displayName: 'Super User',
  login: 'su',
  idProvider: 'system',
  hasPassword: true,
  modifiedTime: '2026-06-02T09:12:00Z',
};

const ADMINISTRATORS: Group = {
  type: 'group',
  key: 'group:system:administrators',
  displayName: 'Administrators',
  description: 'Users with full access',
  modifiedTime: '2026-06-02T09:12:00Z',
};

// TODO: [#8] Fixtures until the backend api settles — then this file calls the endpoint as
// `requestJson<RoleDto[]>(url, { signal })` and maps the wire dto to `Role`; the signal is
// threaded through already, so nothing above it changes.
const ROLES: readonly Role[] = [
  {
    type: 'role',
    key: 'role:system.admin',
    displayName: 'Administrator',
    description: 'Full access to everything',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [SU, ADMINISTRATORS],
  },
  {
    type: 'role',
    key: 'role:system.admin.login',
    displayName: 'Administration Console Login',
    description: 'Login to the administration console',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [ADMINISTRATORS],
  },
  {
    type: 'role',
    key: 'role:system.authenticated',
    displayName: 'Authenticated',
    description: 'Everyone who is logged in',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [],
  },
  {
    type: 'role',
    key: 'role:system.everyone',
    displayName: 'Everyone',
    description: 'Everyone, logged in or not',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [],
  },
  {
    type: 'role',
    key: 'role:system.user.admin',
    displayName: 'User Administrator',
    description: 'Manage users, groups and roles',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [ADMINISTRATORS],
  },
  {
    type: 'role',
    key: 'role:cms.admin',
    displayName: 'Content Manager Administrator',
    description: 'Full access to content and settings',
    modifiedTime: '2026-07-14T14:41:00Z',
    members: [SU],
  },
  {
    type: 'role',
    key: 'role:cms.expert',
    displayName: 'Content Manager Expert',
    description: 'Access to the source of a content',
    modifiedTime: '2026-07-14T14:41:00Z',
    members: [],
  },
  {
    type: 'role',
    key: 'role:store.manager',
    displayName: 'Store Manager',
    description: 'Manage products and orders',
    modifiedTime: '2026-07-21T08:05:00Z',
    members: [SU],
  },
];

export function fetchRoles(signal?: AbortSignal): ResultAsync<Role[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading roles was cancelled'));
  }

  return okAsync([...ROLES]);
}
