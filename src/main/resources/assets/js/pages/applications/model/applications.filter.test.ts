import { describe, expect, it } from 'vitest';

import type { Application } from '../../../entities/application';
import { filterApplications } from './applications.filter';

function application(key: string, displayName: string, description?: string): Application {
  return { key, displayName, description, version: '1.0.0', state: 'STARTED', system: false };
}

const booster = application('com.enonic.app.booster', 'Booster', 'Caches rendered pages');
const fathom = application('com.enonic.app.fathom', 'Fathom');
const applications = [booster, fathom];

describe('filterApplications', () => {
  it('returns every application for an empty or blank query', () => {
    expect(filterApplications(applications, '')).toEqual(applications);
    expect(filterApplications(applications, '   ')).toEqual(applications);
  });

  it('matches the display name whatever the case', () => {
    expect(filterApplications(applications, 'BOOSTER')).toEqual([booster]);
  });

  it('matches the description', () => {
    expect(filterApplications(applications, 'rendered')).toEqual([booster]);
  });

  it('matches the application key', () => {
    expect(filterApplications(applications, 'app.fathom')).toEqual([fathom]);
  });

  it('survives an application without a description', () => {
    expect(filterApplications(applications, 'fathom')).toEqual([fathom]);
  });

  it('leaves the applications it was given alone', () => {
    const original = [...applications];
    filterApplications(applications, 'booster');

    expect(applications).toEqual(original);
  });
});
