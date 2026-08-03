import { describe, expect, it } from 'vitest';

import type { IdProvider } from '../../../entities/principal';
import { visibleEntries } from '../../../widgets/browse-list/browse-filter';
import { providerEntries } from './users.filter';

function provider(key: string, displayName: string): IdProvider {
  return { key, displayName, users: { total: 0 }, groups: { total: 0 } };
}

const providers = [provider('system', 'System'), provider('ldap', 'Company directory')];

describe('providerEntries', () => {
  it('offers one entry per provider, named as the rows name it', () => {
    expect(providerEntries(providers)).toEqual([
      { id: 'system', label: 'System' },
      { id: 'ldap', label: 'Company directory' },
    ]);
  });

  // ! No count, and that is what keeps every provider offered: the rows are one page of a server-side
  // ! search, so a provider absent from this page must still be selectable.
  it('carries no count, so nothing is dropped as empty', () => {
    const entries = providerEntries(providers);

    expect(entries.every(({ count }) => count === undefined)).toBe(true);
    expect(visibleEntries(entries, new Set())).toEqual(entries);
  });

  it('offers nothing on an instance with no providers', () => {
    expect(providerEntries([])).toEqual([]);
  });
});
