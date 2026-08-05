import { describe, expect, it } from 'vitest';

import type { Role } from '../../../entities/principal';
import type { ActionContext, SectionAction } from '../../../widgets/browse-toolbar/actions';
import { ROLE_ACTIONS } from './roles.actions';

const systemRole: Role = {
  type: 'role',
  key: 'role:system.admin',
  displayName: 'Administrator',
  modifiedTime: '2026-07-21T08:05:00Z',
};
const customRole: Role = {
  type: 'role',
  key: 'role:store.manager',
  displayName: 'Store Manager',
  modifiedTime: '2026-07-21T08:05:00Z',
};

function context(overrides: Partial<ActionContext<Role>> = {}): ActionContext<Role> {
  return { selected: [], active: undefined, ...overrides };
}

function action(id: string): SectionAction<Role> {
  const found = ROLE_ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`No role action with id ${id}`);
  }
  return found;
}

describe('role actions', () => {
  it('offers new, edit and delete in that order', () => {
    expect(ROLE_ACTIONS.map(({ id }) => id)).toEqual(['new', 'edit', 'delete']);
  });
});

describe('new role', () => {
  it('needs no selection', () => {
    expect(action('new').enabled(context())).toBe(true);
  });
});

describe('edit role', () => {
  it('needs exactly one target', () => {
    expect(action('edit').enabled(context())).toBe(false);
    expect(action('edit').enabled(context({ selected: [customRole] }))).toBe(true);
    expect(action('edit').enabled(context({ selected: [customRole, systemRole] }))).toBe(false);
  });

  it('falls back to the active row when nothing is ticked', () => {
    expect(action('edit').enabled(context({ active: customRole }))).toBe(true);
  });

  it('ignores the active row once something is ticked', () => {
    expect(
      action('edit').enabled(context({ selected: [customRole, systemRole], active: customRole })),
    ).toBe(false);
  });
});

describe('delete role', () => {
  it('needs a target', () => {
    expect(action('delete').enabled(context())).toBe(false);
  });

  it('takes the active row when nothing is ticked', () => {
    expect(action('delete').enabled(context({ active: customRole }))).toBe(true);
    expect(action('delete').enabled(context({ active: systemRole }))).toBe(false);
  });

  it('deletes one or more roles an administrator created', () => {
    expect(action('delete').enabled(context({ selected: [customRole] }))).toBe(true);
    expect(action('delete').enabled(context({ selected: [customRole, customRole] }))).toBe(true);
  });

  it('refuses as soon as one platform-owned role is a target', () => {
    expect(action('delete').enabled(context({ selected: [systemRole] }))).toBe(false);
    expect(action('delete').enabled(context({ selected: [customRole, systemRole] }))).toBe(false);
  });
});
