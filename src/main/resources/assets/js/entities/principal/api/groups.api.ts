import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { Group } from '../model/principal.types';
import { ALICE, BOB, CONTRIBUTORS, JANE, JOHN, SU } from './fixtures';

// TODO: [#8] Fixtures until the backend api settles — then this file calls the endpoint as
// `requestJson<GroupDto[]>(url, { signal })` and maps the wire dto to `Group`; the signal is
// threaded through already, so nothing above it changes.
const GROUPS: readonly Group[] = [
  {
    type: 'group',
    key: 'group:system:administrators',
    displayName: 'Administrators',
    description: 'Users with full access',
    modifiedTime: '2026-06-02T09:12:00Z',
    members: [SU],
    roles: [
      {
        type: 'role',
        key: 'role:system.admin',
        displayName: 'Administrator',
        modifiedTime: '2026-06-02T09:12:00Z',
      },
      {
        type: 'role',
        key: 'role:system.admin.login',
        displayName: 'Administration Console Login',
        modifiedTime: '2026-06-02T09:12:00Z',
      },
    ],
  },
  {
    type: 'group',
    key: 'group:system:editors',
    displayName: 'Editors',
    description: 'Edits and publishes content',
    modifiedTime: '2026-07-14T14:41:00Z',
    members: [JANE, CONTRIBUTORS],
    roles: [
      {
        type: 'role',
        key: 'role:cms.admin',
        displayName: 'Content Manager Administrator',
        modifiedTime: '2026-07-14T14:41:00Z',
      },
    ],
  },
  {
    type: 'group',
    key: 'group:system:contributors',
    displayName: 'Contributors',
    description: 'Writes content, publishes nothing',
    modifiedTime: '2026-07-14T14:41:00Z',
    members: [JOHN],
    roles: [
      {
        type: 'role',
        key: 'role:cms.expert',
        displayName: 'Content Manager Expert',
        modifiedTime: '2026-07-14T14:41:00Z',
      },
    ],
  },
  {
    type: 'group',
    key: 'group:ldap:developers',
    displayName: 'Developers',
    description: 'Deploys applications',
    modifiedTime: '2026-07-19T07:45:00Z',
    members: [ALICE, BOB],
    roles: [
      {
        type: 'role',
        key: 'role:system.admin.login',
        displayName: 'Administration Console Login',
        modifiedTime: '2026-06-02T09:12:00Z',
      },
    ],
  },
  {
    type: 'group',
    key: 'group:ldap:support',
    displayName: 'Support',
    modifiedTime: '2026-07-19T07:45:00Z',
    members: [],
    roles: [],
  },
];

export function fetchGroups(signal?: AbortSignal): ResultAsync<Group[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading groups was cancelled'));
  }

  return okAsync([...GROUPS]);
}
