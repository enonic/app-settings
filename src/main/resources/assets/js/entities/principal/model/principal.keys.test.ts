import { describe, expect, it } from 'vitest';

import { idProviderOf, isSystemRole, isSystemUser, principalName } from './principal.keys';

describe('isSystemRole', () => {
  it('holds for a role the platform ships', () => {
    expect(isSystemRole('role:system.admin')).toBe(true);
    expect(isSystemRole('role:system.everyone')).toBe(true);
  });

  it('holds for a project role', () => {
    expect(isSystemRole('role:cms.project.default.owner')).toBe(true);
  });

  it('fails for a role an administrator created', () => {
    expect(isSystemRole('role:store.manager')).toBe(false);
    expect(isSystemRole('role:cms.admin')).toBe(false);
  });

  it('fails for a principal that is not a role', () => {
    expect(isSystemRole('user:system:su')).toBe(false);
    expect(isSystemRole('group:system:administrators')).toBe(false);
  });
});

describe('isSystemUser', () => {
  it('holds for the two users the platform owns', () => {
    expect(isSystemUser('user:system:su')).toBe(true);
    expect(isSystemUser('user:system:anonymous')).toBe(true);
  });

  it('fails for a user an administrator created, even in the system provider', () => {
    expect(isSystemUser('user:system:jane')).toBe(false);
    expect(isSystemUser('user:ldap:alice')).toBe(false);
  });
});

describe('principalName', () => {
  it('takes the name a role key ends with, dots and all', () => {
    expect(principalName('role:cms.admin')).toBe('cms.admin');
    expect(principalName('role:cms.project.default.owner')).toBe('cms.project.default.owner');
  });

  it('takes the name after the provider for a user or a group', () => {
    expect(principalName('user:ldap:alice')).toBe('alice');
    expect(principalName('group:system:administrators')).toBe('administrators');
  });
});

describe('idProviderOf', () => {
  it('reads the provider out of a user or group key', () => {
    expect(idProviderOf('user:system:su')).toBe('system');
    expect(idProviderOf('group:ldap:developers')).toBe('ldap');
  });

  it('gives a role no provider', () => {
    expect(idProviderOf('role:system.admin')).toBeUndefined();
  });
});
