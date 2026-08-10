import type { ResultAsync } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import {
  sendPublicKeyAddition,
  sendPublicKeyRemoval,
  sendUserCreation,
  sendUserUpdate,
  type UserChanges,
  type UserInput,
} from '../api/users.api';
import type { PrincipalKey, PublicKey, User } from './principal.types';

export type UserDraft = {
  idProvider: string;
  name: string;
  displayName: string;
  email: string;
  password?: string;
  roles: readonly PrincipalKey[];
  groups: readonly PrincipalKey[];
};

export type UserEdit = {
  displayName: string;
  email: string;
  password?: string;
  addRoles: readonly PrincipalKey[];
  removeRoles: readonly PrincipalKey[];
  addGroups: readonly PrincipalKey[];
  removeGroups: readonly PrincipalKey[];
};

export function createUser(draft: UserDraft): ResultAsync<User, AppError> {
  return sendUserCreation(draft.idProvider, draft.name.trim(), {
    displayName: draft.displayName.trim(),
    email: nonEmpty(draft.email),
    password: draft.password,
    roles: draft.roles,
    groups: draft.groups,
  } satisfies UserInput);
}

export function updateUser(key: PrincipalKey, edit: UserEdit): ResultAsync<User, AppError> {
  return sendUserUpdate(key, {
    displayName: edit.displayName.trim(),
    email: nonEmpty(edit.email),
    password: edit.password,
    addRoles: edit.addRoles,
    removeRoles: edit.removeRoles,
    addGroups: edit.addGroups,
    removeGroups: edit.removeGroups,
  } satisfies UserChanges);
}

export function addPublicKey(
  key: PrincipalKey,
  publicKey: string,
  label?: string,
): ResultAsync<PublicKey, AppError> {
  const named = label?.trim();

  return sendPublicKeyAddition(
    key,
    publicKey,
    named !== undefined && named.length > 0 ? named : undefined,
  );
}

export function removePublicKey(key: PrincipalKey, kid: string): ResultAsync<void, AppError> {
  return sendPublicKeyRemoval(key, kid);
}

function nonEmpty(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
