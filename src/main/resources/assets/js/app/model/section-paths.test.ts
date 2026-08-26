import { describe, expect, it } from 'vitest';

import { lastSubPath, rememberSubPath } from './section-paths';

describe('section paths', () => {
  it('is the section root for a section nobody has been in', () => {
    expect(lastSubPath('never-visited')).toBe('');
  });

  it('remembers where the user was, search params and all', () => {
    rememberSubPath('users', '/u1/edit?tab=roles');

    expect(lastSubPath('users')).toBe('/u1/edit?tab=roles');
  });

  it('keeps one memory per section', () => {
    rememberSubPath('roles', '/r1');
    rememberSubPath('groups', '/g1');

    expect(lastSubPath('roles')).toBe('/r1');
    expect(lastSubPath('groups')).toBe('/g1');
  });

  it('holds the latest place, not the first', () => {
    rememberSubPath('applications', '/a1');
    rememberSubPath('applications', '/a2');

    expect(lastSubPath('applications')).toBe('/a2');
  });
});
