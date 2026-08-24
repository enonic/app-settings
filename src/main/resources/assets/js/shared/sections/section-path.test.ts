import { describe, expect, it } from 'vitest';

import { readSubPath, sectionPath } from './section-path';

describe('readSubPath', () => {
  it('is what follows the section slug', () => {
    expect(readSubPath('/users/u1/edit', '', 'users')).toBe('/u1/edit');
  });

  it('is empty at the section root', () => {
    expect(readSubPath('/users', '', 'users')).toBe('');
  });

  it('carries the search string, repeated keys and all', () => {
    expect(readSubPath('/users/u1', '?q=b&q=a', 'users')).toBe('/u1?q=b&q=a');
  });

  it('carries a search string at the section root', () => {
    expect(readSubPath('/users', '?q=a', 'users')).toBe('?q=a');
  });

  it('is empty while another section is the one showing', () => {
    expect(readSubPath('/roles/r1', '', 'users')).toBe('');
  });

  it('does not answer for a slug its own merely begins', () => {
    expect(readSubPath('/users-admin/x', '', 'users')).toBe('');
  });
});

describe('sectionPath', () => {
  it('puts the sub-path under the section', () => {
    expect(sectionPath('users', '/u1/edit')).toBe('/users/u1/edit');
  });

  it('is the section root for an empty sub-path', () => {
    expect(sectionPath('users', '')).toBe('/users');
  });

  it('takes a sub-path written without its leading slash', () => {
    expect(sectionPath('users', 'u1')).toBe('/users/u1');
  });

  it('leaves the search string exactly as the guest wrote it', () => {
    expect(sectionPath('users', '/u1?q=b&q=a&name=a%20b')).toBe('/users/u1?q=b&q=a&name=a%20b');
  });

  it('keeps a search string with nothing in front of it', () => {
    expect(sectionPath('users', '?q=a')).toBe('/users?q=a');
  });

  it('keeps a second question mark inside the search string', () => {
    expect(sectionPath('users', '/u1?q=a?b')).toBe('/users/u1?q=a?b');
  });

  it('escapes a hash that would otherwise end the url', () => {
    expect(sectionPath('users', '/u1?q=a#top')).toBe('/users/u1?q=a%23top');
  });

  it('drops a trailing slash', () => {
    expect(sectionPath('users', '/u1/')).toBe('/users/u1');
  });
});
