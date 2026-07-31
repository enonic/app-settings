import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { Group } from '../model/principal.types';
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

// TODO: [#8] Fixtures until the backend api settles — then this file calls the endpoint as
// `requestJson<GroupDto[]>(url, { signal })` and maps the wire dto to `Group`; the signal is
// threaded through already, so nothing above it changes.
const GROUPS: readonly Group[] = [
  { ...ADMINISTRATORS, members: [SU], roles: [ADMIN_ROLE, ADMIN_LOGIN_ROLE] },
  { ...EDITORS, members: [JANE, CONTRIBUTORS], roles: [CMS_ADMIN_ROLE] },
  { ...CONTRIBUTORS, members: [JOHN], roles: [CMS_EXPERT_ROLE] },
  { ...DEVELOPERS, members: [ALICE, BOB], roles: [ADMIN_LOGIN_ROLE] },
  { ...SUPPORT, members: [CAROL], roles: [] },
  { ...MARKETING, members: [ERIK, MAJA], roles: [CMS_ADMIN_ROLE, CMS_EXPERT_ROLE] },
];

export function fetchGroups(signal?: AbortSignal): ResultAsync<Group[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading groups was cancelled'));
  }

  return okAsync([...GROUPS]);
}
