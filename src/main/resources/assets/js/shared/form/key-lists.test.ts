import { describe, expect, it } from 'vitest';

import { diffByKey, mergeByKey, sameKeys } from './key-lists';

const su = { key: 'user:system:su', displayName: 'Super User' };
const jane = { key: 'user:system:jane', displayName: 'Jane' };

describe('mergeByKey', () => {
  it('takes the loaded list when the form has been left alone', () => {
    expect(mergeByKey([su], [])).toEqual([su]);
  });

  it('keeps what was ticked while the list was still loading', () => {
    expect(mergeByKey([su], [jane])).toEqual([su, jane]);
  });

  it('lists an entry held by both sides once, as the loaded side has it', () => {
    expect(mergeByKey([su, jane], [{ ...jane, displayName: 'Stale' }])).toEqual([su, jane]);
  });

  it('answers an empty list when neither side holds anything', () => {
    expect(mergeByKey([], [])).toEqual([]);
  });
});

describe('sameKeys', () => {
  it('reports two empty lists as the same', () => {
    expect(sameKeys([], [])).toBe(true);
  });

  it('sees an entry added and an entry removed', () => {
    expect(sameKeys([su], [su, jane])).toBe(false);
    expect(sameKeys([su, jane], [su])).toBe(false);
  });

  it('ignores the order, which is not part of what a list names', () => {
    expect(sameKeys([su, jane], [jane, su])).toBe(true);
  });

  // Two lists of the same length holding different things: the length check alone would pass them.
  it('compares the keys rather than the count', () => {
    expect(sameKeys([su], [jane])).toBe(false);
  });
});

describe('diffByKey', () => {
  it('names nothing when the list stood still', () => {
    expect(diffByKey([su, jane], [jane, su])).toEqual({ added: [], removed: [] });
  });

  it('names what arrived and what left', () => {
    expect(diffByKey([su], [jane])).toEqual({
      added: ['user:system:jane'],
      removed: ['user:system:su'],
    });
  });

  it('says nothing about an entry neither side holds', () => {
    expect(diffByKey([su], [su])).toEqual({ added: [], removed: [] });
  });

  it('reads an emptied list as every entry removed', () => {
    expect(diffByKey([su, jane], [])).toEqual({
      added: [],
      removed: ['user:system:su', 'user:system:jane'],
    });
  });

  it('reads a list filled from nothing as every entry added', () => {
    expect(diffByKey([], [su])).toEqual({ added: ['user:system:su'], removed: [] });
  });
});
