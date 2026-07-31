import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { Role } from '../model/principal.types';
import {
  ADMIN_LOGIN_ROLE,
  ADMIN_ROLE,
  ADMINISTRATORS,
  AUTHENTICATED_ROLE,
  CMS_ADMIN_ROLE,
  CMS_EXPERT_ROLE,
  EVERYONE_ROLE,
  STORE_MANAGER_ROLE,
  SU,
  USER_ADMIN_ROLE,
} from './fixtures';

// TODO: [#8] Fixtures until the backend api settles — then this file calls the endpoint as
// `requestJson<RoleDto[]>(url, { signal })` and maps the wire dto to `Role`; the signal is
// threaded through already, so nothing above it changes.
const ROLES: readonly Role[] = [
  { ...ADMIN_ROLE, members: [SU, ADMINISTRATORS] },
  { ...ADMIN_LOGIN_ROLE, members: [ADMINISTRATORS] },
  { ...AUTHENTICATED_ROLE, members: [] },
  { ...EVERYONE_ROLE, members: [] },
  { ...USER_ADMIN_ROLE, members: [ADMINISTRATORS] },
  { ...CMS_ADMIN_ROLE, members: [SU] },
  { ...CMS_EXPERT_ROLE, members: [] },
  { ...STORE_MANAGER_ROLE, members: [SU] },
];

export function fetchRoles(signal?: AbortSignal): ResultAsync<Role[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading roles was cancelled'));
  }

  return okAsync([...ROLES]);
}
