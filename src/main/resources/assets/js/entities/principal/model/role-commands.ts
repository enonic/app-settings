import type { ResultAsync } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import { sendRoleCreation, sendRoleUpdate, type RoleInput } from '../api/roles.api';
import type { PrincipalKey, Role } from './principal.types';

export type RoleDraft = {
  name: string;
  displayName: string;
  description: string;
  members: readonly PrincipalKey[];
};

/**
 * Both return a `Result` rather than notifying: the dialog stays open on failure and is the screen the
 * save fails on, so the message belongs on it. A command whose caller has no such screen — every toolbar
 * action — still reports through `notifyError` itself.
 */
export function createRole(draft: RoleDraft): ResultAsync<Role, AppError> {
  return sendRoleCreation(draft.name.trim(), toInput(draft));
}

export function updateRole(key: PrincipalKey, draft: RoleDraft): ResultAsync<Role, AppError> {
  return sendRoleUpdate(key, toInput(draft));
}

function toInput({ displayName, description, members }: RoleDraft): RoleInput {
  const described = description.trim();

  return {
    displayName: displayName.trim(),
    description: described.length > 0 ? described : undefined,
    members,
  };
}
