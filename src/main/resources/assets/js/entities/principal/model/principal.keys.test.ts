import { describe, expect, it } from 'vitest';

import { idProviderOf, isSystemRole, toPrincipalPath } from './principal.keys';

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

describe('toPrincipalPath', () => {
  it('leads with a slash and separates on slashes', () => {
    expect(toPrincipalPath('role:system.admin')).toBe('/role/system.admin');
  });

  it('keeps every segment of a key that carries a provider', () => {
    expect(toPrincipalPath('user:system:su')).toBe('/user/system/su');
    expect(toPrincipalPath('group:system:administrators')).toBe('/group/system/administrators');
  });

  it('leaves the dots inside an id alone', () => {
    expect(toPrincipalPath('role:cms.project.default.owner')).toBe(
      '/role/cms.project.default.owner',
    );
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
