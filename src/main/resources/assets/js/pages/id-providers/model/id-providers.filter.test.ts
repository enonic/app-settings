import { describe, expect, it } from 'vitest';

import type { IdProvider } from '../../../entities/principal';
import { filterIdProviders } from './id-providers.filter';

const system: IdProvider = {
  key: 'system',
  displayName: 'System',
  description: 'The users the installation was set up with',
  users: [],
  groups: [],
  roles: [],
};

const partners: IdProvider = {
  key: 'partners',
  displayName: 'Partners',
  users: [],
  groups: [],
  roles: [],
};
const providers = [system, partners];

describe('filterIdProviders', () => {
  it('returns every provider for an empty or blank query', () => {
    expect(filterIdProviders(providers, '')).toEqual(providers);
    expect(filterIdProviders(providers, '  ')).toEqual(providers);
  });

  it('matches the display name whatever the case', () => {
    expect(filterIdProviders(providers, 'PARTNERS')).toEqual([partners]);
  });

  it('matches the key, which is the provider name', () => {
    expect(filterIdProviders(providers, 'system')).toEqual([system]);
  });

  it('matches the description too', () => {
    expect(filterIdProviders(providers, 'installation')).toEqual([system]);
  });

  it('survives a provider without a description', () => {
    expect(filterIdProviders(providers, 'partn')).toEqual([partners]);
  });

  it('leaves the providers it was given alone', () => {
    const original = [...providers];
    filterIdProviders(providers, 'system');

    expect(providers).toEqual(original);
  });
});
