import { describe, expect, it } from 'vitest';

import type { Group } from '../../../entities/principal';
import { toGroupRow } from './groups.rows';

const group: Group = {
  type: 'group',
  key: 'group:ldap:developers',
  displayName: 'Developers',
  description: 'Deploys applications',
  modifiedTime: '2026-07-19T07:45:00Z',
  members: [],
  roles: [],
};

describe('toGroupRow', () => {
  it('keys the row by the group key so the route param matches', () => {
    expect(toGroupRow(group).key).toBe('group:ldap:developers');
  });

  it('shows the display name over the key as a path', () => {
    const { title, subtitle } = toGroupRow(group);

    expect(title).toBe('Developers');
    expect(subtitle).toBe('/group/ldap/developers');
  });

  it('carries the provider as its only meta cell', () => {
    expect(toGroupRow(group).meta).toEqual(['ldap']);
  });

  it('carries the icon the page hands it', () => {
    expect(toGroupRow(group, 'icon').icon).toBe('icon');
  });
});
