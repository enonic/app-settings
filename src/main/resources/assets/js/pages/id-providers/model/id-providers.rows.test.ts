import { describe, expect, it } from 'vitest';

import type { IdProvider } from '../../../entities/principal';
import { toIdProviderRow } from './id-providers.rows';

const provider: IdProvider = {
  key: 'ldap',
  displayName: 'Company directory',
  description: 'Everyone with a company account',
  idProviderConfig: { applicationKey: 'com.enonic.app.ldapidprovider' },
  users: [],
  groups: [],
  roles: [],
};

describe('toIdProviderRow', () => {
  it('keys the row by the provider key so the route param matches', () => {
    expect(toIdProviderRow(provider).key).toBe('ldap');
  });

  it('shows the display name over the provider key', () => {
    const { title, subtitle } = toIdProviderRow(provider);

    expect(title).toBe('Company directory');
    expect(subtitle).toBe('ldap');
  });

  it('carries the bound application as its only meta cell', () => {
    expect(toIdProviderRow(provider).meta).toEqual(['com.enonic.app.ldapidprovider']);
  });

  it('renders no cell at all for a provider bound to no application', () => {
    const unbound: IdProvider = {
      key: 'partners',
      displayName: 'Partners',
      users: [],
      groups: [],
      roles: [],
    };

    expect(toIdProviderRow(unbound).meta).toBeUndefined();
  });
});
