import { describe, expect, it } from 'vitest';

import type { Role } from '../../../entities/principal';
import {
  initialRoleForm,
  nextRoleForm,
  roleNameOf,
  validateRoleForm,
  type RoleForm,
} from './role-form';

const role: Role = {
  type: 'role',
  key: 'role:store.manager',
  displayName: 'Store Manager',
  description: 'Runs the shop',
};

const members = [{ key: 'user:system:alice', type: 'user', displayName: 'Alice' }] as const;

function form(overrides: Partial<RoleForm> = {}): RoleForm {
  return {
    name: 'store.manager',
    displayName: 'Store Manager',
    description: '',
    members: [],
    ...overrides,
  };
}

describe('initialRoleForm', () => {
  it('starts empty for a new role', () => {
    expect(initialRoleForm({ mode: 'create' })).toEqual({
      name: '',
      displayName: '',
      description: '',
      members: [],
    });
  });

  it('takes the name off the key, not off the display name', () => {
    expect(initialRoleForm({ mode: 'edit', role }).name).toBe('store.manager');
  });

  it('takes the members it is handed, which the list row does not carry', () => {
    expect(initialRoleForm({ mode: 'edit', role }, members).members).toEqual(members);
  });

  it('starts with no members while they are still being loaded', () => {
    expect(initialRoleForm({ mode: 'edit', role }).members).toEqual([]);
  });

  it('reads a missing description as an empty field, not as undefined', () => {
    const described = initialRoleForm({ mode: 'edit', role: { ...role, description: undefined } });

    expect(described.description).toBe('');
  });
});

describe('roleNameOf', () => {
  it('drops the role prefix and nothing else', () => {
    expect(roleNameOf({ ...role, key: 'role:cms.project.intranet.owner' })).toBe(
      'cms.project.intranet.owner',
    );
  });
});

describe('nextRoleForm', () => {
  const previous = form({ name: 'store.manager', displayName: 'Store Manager' });

  it('lets the name follow the display name while the user has not touched it', () => {
    const next = { ...previous, displayName: 'Store Floor Manager' };

    expect(nextRoleForm(previous, next, 'create', false)).toEqual({
      values: { ...next, name: 'store.floor.manager' },
      nameEdited: false,
    });
  });

  it('keeps a typed name exactly as typed, in the same edit that reports it', () => {
    const next = { ...previous, name: 's' };

    expect(nextRoleForm(previous, next, 'create', false)).toEqual({
      values: next,
      nameEdited: true,
    });
  });

  it('stops deriving once the name is the user’s', () => {
    const next = { ...previous, displayName: 'Something Else' };

    expect(nextRoleForm(previous, next, 'create', true)).toEqual({
      values: next,
      nameEdited: true,
    });
  });

  it('never derives while editing, where the name is fixed', () => {
    const next = { ...previous, displayName: 'Renamed' };

    expect(nextRoleForm(previous, next, 'edit', false)).toEqual({
      values: next,
      nameEdited: false,
    });
  });

  it('leaves the other fields alone', () => {
    const next = { ...previous, description: 'Runs the shop', members: [] };

    expect(nextRoleForm(previous, next, 'create', true).values.description).toBe('Runs the shop');
  });
});

describe('validateRoleForm', () => {
  it('passes a filled form', () => {
    expect(validateRoleForm(form(), 'create')).toEqual({});
  });

  it('requires a display name', () => {
    expect(validateRoleForm(form({ displayName: '  ' }), 'create')).toEqual({
      displayName: 'roles.dialog.displayNameRequired',
    });
  });

  it('requires a name while creating', () => {
    expect(validateRoleForm(form({ name: '' }), 'create')).toEqual({
      name: 'roles.dialog.nameRequired',
    });
  });

  it('refuses a name carrying a character XP rejects', () => {
    expect(validateRoleForm(form({ name: 'store manager' }), 'create').name).toBe(
      'roles.dialog.nameInvalid',
    );
    expect(validateRoleForm(form({ name: 'store:manager' }), 'create').name).toBe(
      'roles.dialog.nameInvalid',
    );
  });

  it('says nothing about the name while editing', () => {
    expect(validateRoleForm(form({ name: '' }), 'edit')).toEqual({});
  });

  it('reports both fields at once rather than one at a time', () => {
    expect(validateRoleForm(form({ name: '', displayName: '' }), 'create')).toEqual({
      name: 'roles.dialog.nameRequired',
      displayName: 'roles.dialog.displayNameRequired',
    });
  });
});
