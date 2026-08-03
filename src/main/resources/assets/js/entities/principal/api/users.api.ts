import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { User } from '../model/principal.types';
import {
  ADMIN_LOGIN_ROLE,
  ADMIN_ROLE,
  ADMINISTRATORS,
  ALICE,
  BOB,
  CAROL,
  CMS_ADMIN_ROLE,
  CMS_EXPERT_ROLE,
  CONTRIBUTORS,
  DEVELOPERS,
  EDITORS,
  ERIK,
  JANE,
  JOHN,
  MAJA,
  MARKETING,
  SU,
  SUPPORT,
} from './fixtures';

// TODO: [#37] Fixtures until Users moves onto the schema — the other three subdomains already call
// `requestGraphQl`, and this one waits because it is the only section that cannot load whole: it needs
// server-side search, filter, sort and paging through `findUsers`. `description` and `createdTime` have
// no home in `lib/xp/auth`'s user either and will have to come off the node behind the principal.
const USERS: readonly User[] = [
  {
    ...SU,
    description: 'The account the installation was bootstrapped with',
    createdTime: '2025-07-20T15:42:00Z',
    roles: [ADMIN_ROLE, ADMIN_LOGIN_ROLE, CMS_ADMIN_ROLE],
    groups: [ADMINISTRATORS],
  },
  {
    ...JANE,
    description: 'Edits and publishes the public site',
    createdTime: '2026-02-11T10:05:00Z',
    roles: [ADMIN_LOGIN_ROLE, CMS_ADMIN_ROLE],
    groups: [EDITORS],
  },
  {
    ...JOHN,
    createdTime: '2026-03-04T08:20:00Z',
    roles: [CMS_EXPERT_ROLE],
    groups: [CONTRIBUTORS],
  },
  {
    ...ALICE,
    description: 'Runs the deployment pipeline',
    createdTime: '2026-05-30T13:15:00Z',
    roles: [ADMIN_LOGIN_ROLE],
    groups: [DEVELOPERS],
  },
  {
    ...BOB,
    createdTime: '2026-05-30T13:15:00Z',
    roles: [],
    groups: [DEVELOPERS],
  },
  {
    ...CAROL,
    description: 'On leave, account disabled',
    createdTime: '2026-06-15T09:00:00Z',
    roles: [],
    groups: [SUPPORT],
  },
  {
    ...ERIK,
    description: 'Runs the campaign site',
    createdTime: '2026-06-01T09:00:00Z',
    roles: [CMS_ADMIN_ROLE],
    groups: [MARKETING],
  },
  {
    ...MAJA,
    createdTime: '2026-06-01T09:00:00Z',
    roles: [CMS_EXPERT_ROLE],
    groups: [MARKETING],
  },
];

export function fetchUsers(signal?: AbortSignal): ResultAsync<User[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading users was cancelled'));
  }

  return okAsync([...USERS]);
}
