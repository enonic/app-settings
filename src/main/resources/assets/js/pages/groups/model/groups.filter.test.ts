import { describe, expect, it } from 'vitest';

import type { Group } from '../../../entities/principal';
import { filterGroups } from './groups.filter';

function group(key: string, displayName: string, description?: string): Group {
  return {
    type: 'group',
    key: `group:system:${key}`,
    displayName,
    description,
    modifiedTime: '2026-07-14T14:41:00Z',
    members: [],
    roles: [],
  };
}

const editors = group('editors', 'Editors', 'Edits and publishes content');
const support = group('support', 'Support');
const groups = [editors, support];

describe('filterGroups', () => {
  it('returns every group for an empty or blank query', () => {
    expect(filterGroups(groups, '')).toEqual(groups);
    expect(filterGroups(groups, '  ')).toEqual(groups);
  });

  it('matches the display name whatever the case', () => {
    expect(filterGroups(groups, 'SUPPORT')).toEqual([support]);
  });

  it('matches the description too', () => {
    expect(filterGroups(groups, 'publishes')).toEqual([editors]);
  });

  it('survives a group without a description', () => {
    expect(filterGroups(groups, 'sup')).toEqual([support]);
  });

  it('ignores the group key', () => {
    expect(filterGroups(groups, 'system')).toEqual([]);
  });

  it('leaves the groups it was given alone', () => {
    const original = [...groups];
    filterGroups(groups, 'editors');

    expect(groups).toEqual(original);
  });
});
