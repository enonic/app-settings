import { describe, expect, it } from 'vitest';

import { toRoles } from './roles.api';

function wireRole(overrides: Record<string, unknown> = {}) {
  return {
    key: 'role:system.admin',
    displayName: 'Administrator',
    description: 'Full access',
    modifiedTime: '2026-08-01T10:00:00Z',
    members: [],
    ...overrides,
  };
}

describe('toRoles', () => {
  it('maps the wire payload to the domain role', () => {
    expect(toRoles([wireRole()])).toEqual([
      {
        type: 'role',
        key: 'role:system.admin',
        displayName: 'Administrator',
        description: 'Full access',
        modifiedTime: '2026-08-01T10:00:00Z',
        members: [],
      },
    ]);
  });

  it('reports a null description and modified time as absent', () => {
    const [role] = toRoles([wireRole({ description: null, modifiedTime: null })]);

    expect(role?.description).toBeUndefined();
    expect(role?.modifiedTime).toBeUndefined();
  });

  it('reports an empty description as absent, so the panel omits the field', () => {
    const [role] = toRoles([wireRole({ description: '' })]);

    expect(role?.description).toBeUndefined();
  });

  it('carries members through as the three fields a membership row shows', () => {
    const [role] = toRoles([
      wireRole({
        members: [
          { key: 'user:system:su', type: 'user', displayName: 'Super User' },
          { key: 'group:system:administrators', type: 'group', displayName: 'Administrators' },
        ],
      }),
    ]);

    expect(role?.members).toEqual([
      { key: 'user:system:su', type: 'user', displayName: 'Super User' },
      { key: 'group:system:administrators', type: 'group', displayName: 'Administrators' },
    ]);
  });

  it('answers an empty list when the instance carries no roles', () => {
    expect(toRoles([])).toEqual([]);
  });
});
