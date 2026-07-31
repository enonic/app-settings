import { describe, expect, it } from 'vitest';

import { getInitials } from './initials';

describe('getInitials', () => {
  it('takes the first and last word of a name', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('John Ronald Reuel Tolkien')).toBe('JT');
  });

  it('takes a single letter from a single word', () => {
    expect(getInitials('administrator')).toBe('A');
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(getInitials('  Ada   Lovelace  ')).toBe('AL');
  });

  it('resolves an empty name to an empty string', () => {
    expect(getInitials('   ')).toBe('');
  });
});
