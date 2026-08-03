import { describe, expect, it } from 'vitest';

import { displayNameOf, localNameOf, toPrincipalItem } from './principal.source';

describe('localNameOf', () => {
  it('drops the type prefix of a role key', () => {
    expect(localNameOf('role:system.admin')).toBe('system.admin');
  });

  it('keeps only the last segment, so a user key loses its provider too', () => {
    expect(localNameOf('user:system:su')).toBe('su');
  });

  it('leaves a key with no separator alone, which is what an id provider key is', () => {
    expect(localNameOf('system')).toBe('system');
  });
});

describe('displayNameOf', () => {
  it('reports the display name the value carries', () => {
    expect(displayNameOf({ key: 'role:system.admin', displayName: 'Administrator' })).toBe(
      'Administrator',
    );
  });

  it('falls back to the name from the key when the display name is empty', () => {
    expect(displayNameOf({ key: 'role:system.admin', displayName: '' })).toBe('system.admin');
  });

  it('survives a display name the bridge never sent', () => {
    expect(displayNameOf({ key: 'role:cms.admin' })).toBe('cms.admin');
  });

  it('takes an id provider as readily as a principal', () => {
    expect(displayNameOf({ key: 'ldap' })).toBe('ldap');
  });
});

describe('toPrincipalItem', () => {
  it('keeps the key and the kind, resolving the display name', () => {
    expect(
      toPrincipalItem({ key: 'user:system:su', type: 'user', displayName: 'Super User' }),
    ).toEqual({ key: 'user:system:su', type: 'user', displayName: 'Super User' });
  });

  it('falls back to the name from the key', () => {
    expect(toPrincipalItem({ key: 'group:system:ops', type: 'group' }).displayName).toBe('ops');
  });
});
