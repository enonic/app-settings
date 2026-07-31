import { describe, expect, it } from 'vitest';

import { formatBytes } from './bytes';

describe('formatBytes', () => {
  it('keeps whole bytes below the first step', () => {
    expect(formatBytes(0, 'en-GB')).toBe('0 B');
    expect(formatBytes(999, 'en-GB')).toBe('999 B');
  });

  it('steps up by 1000 and keeps one decimal under ten', () => {
    expect(formatBytes(1000, 'en-GB')).toBe('1.0 kB');
    expect(formatBytes(1_536_000, 'en-GB')).toBe('1.5 MB');
  });

  it('drops the decimal from ten units up', () => {
    expect(formatBytes(12_300_000, 'en-GB')).toBe('12 MB');
  });

  it('stops at the largest unit it knows', () => {
    expect(formatBytes(5_000_000_000_000_000, 'en-GB')).toBe('5,000 TB');
  });

  it('resolves a negative or non-finite size to an empty string', () => {
    expect(formatBytes(-1, 'en-GB')).toBe('');
    expect(formatBytes(Number.NaN, 'en-GB')).toBe('');
  });
});
