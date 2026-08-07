import {
  derivePrincipalName,
  isIllegalPrincipalName,
  type PrincipalRef,
  type Role,
} from '../../../entities/principal';
import type { FieldErrors } from '../../../shared/form';
import type { RoleEditorPayload } from './role-editor.store';

export type RoleForm = {
  name: string;
  displayName: string;
  description: string;
  members: readonly PrincipalRef[];
};

export type RoleFormField = 'name' | 'displayName';

export type RoleFormErrors = FieldErrors<RoleFormField>;

export type RoleFormChange = {
  values: RoleForm;
  nameEdited: boolean;
};

export function initialRoleForm(
  payload: RoleEditorPayload,
  members: readonly PrincipalRef[] = [],
): RoleForm {
  if (payload.mode === 'create') {
    return { name: '', displayName: '', description: '', members: [] };
  }

  return {
    name: roleNameOf(payload.role),
    displayName: payload.role.displayName,
    description: payload.role.description ?? '',
    members,
  };
}

export function roleNameOf(role: Role): string {
  return role.key.slice('role:'.length);
}

/**
 * ! The member list arrives after the dialog opens, and the picker is live in the meantime. Assigning the
 * ! answer over the form would drop whatever was ticked while it was in flight — and since `Save` sends
 * ! the whole list, dropping it means removing those members from the role.
 */
export function mergeRoleMembers(
  loaded: readonly PrincipalRef[],
  edited: readonly PrincipalRef[],
): PrincipalRef[] {
  const known = new Set(loaded.map(({ key }) => key));

  return [...loaded, ...edited.filter(({ key }) => !known.has(key))];
}

export function nextRoleForm(
  previous: RoleForm,
  next: RoleForm,
  mode: RoleEditorPayload['mode'],
  nameEdited: boolean,
): RoleFormChange {
  if (next.name !== previous.name) {
    return { values: next, nameEdited: true };
  }

  if (nameEdited || mode === 'edit') {
    return { values: next, nameEdited };
  }

  return { values: { ...next, name: derivePrincipalName(next.displayName) }, nameEdited: false };
}

/**
 * Whether the form still says what was saved.
 *
 * Compared the way the form is sent: the scalars trimmed, since the command trims them, and the members
 * as a set, since their order is not part of what a role holds.
 */
export function sameRoleForm(saved: RoleForm, edited: RoleForm): boolean {
  return (
    saved.name.trim() === edited.name.trim() &&
    saved.displayName.trim() === edited.displayName.trim() &&
    saved.description.trim() === edited.description.trim() &&
    sameMembers(saved.members, edited.members)
  );
}

export function validateRoleForm(form: RoleForm, mode: RoleEditorPayload['mode']): RoleFormErrors {
  const errors: RoleFormErrors = {};

  if (form.displayName.trim().length === 0) {
    errors.displayName = 'roles.dialog.displayNameRequired';
  }

  if (mode === 'create') {
    const name = form.name.trim();
    if (name.length === 0) {
      errors.name = 'roles.dialog.nameRequired';
    } else if (isIllegalPrincipalName(name)) {
      errors.name = 'roles.dialog.nameInvalid';
    }
  }

  return errors;
}

function sameMembers(saved: readonly PrincipalRef[], edited: readonly PrincipalRef[]): boolean {
  if (saved.length !== edited.length) {
    return false;
  }

  const keys = new Set(saved.map(({ key }) => key));

  return edited.every(({ key }) => keys.has(key));
}
