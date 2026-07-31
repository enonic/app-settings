import { describe, expect, it } from 'vitest';

import { withCount } from './details-panel';

describe('withCount', () => {
  it('appends the count in brackets', () => {
    expect(withCount('Members', 8)).toBe('Members (8)');
  });

  it('keeps a count of zero, which is not the same as having none', () => {
    expect(withCount('Members', 0)).toBe('Members (0)');
  });

  it('leaves the label alone when there is no count', () => {
    expect(withCount('Role', undefined)).toBe('Role');
  });
});
