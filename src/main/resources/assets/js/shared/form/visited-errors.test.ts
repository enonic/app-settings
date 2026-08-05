import { describe, expect, it } from 'vitest';

import { visitedErrors } from './visited-errors';

type Field = 'name' | 'displayName';

const both: Partial<Record<Field, string>> = {
  name: 'nameRequired',
  displayName: 'displayNameRequired',
};

describe('visitedErrors', () => {
  it('shows nothing while no field has been left', () => {
    expect(visitedErrors<Field>(both, new Set())).toEqual({});
  });

  it('shows only the fields the user has been in and left', () => {
    expect(visitedErrors<Field>(both, new Set(['displayName']))).toEqual({
      displayName: 'displayNameRequired',
    });
  });

  it('keeps quiet about a visited field that is fine', () => {
    expect(visitedErrors<Field>({}, new Set(['name']))).toEqual({});
  });
});
