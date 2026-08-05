import { describe, expect, it } from 'vitest';

import type { Application } from '../../../entities/application';
import { applicationStateLabelKey, toApplicationRow } from './applications.rows';

function application(overrides: Partial<Application> = {}): Application {
  return {
    key: 'com.enonic.app.booster',
    displayName: 'Booster',
    description: 'Caches rendered pages',
    version: '1.2.0',
    state: 'STARTED',
    system: false,
    local: false,
    ...overrides,
  };
}

describe('toApplicationRow', () => {
  it('keys the row by the application key and puts the description under the name', () => {
    const row = toApplicationRow(application());

    expect(row.key).toBe('com.enonic.app.booster');
    expect(row.title).toBe('Booster');
    expect(row.subtitle).toBe('Caches rendered pages');
  });

  it('shows the version and the state label, state last', () => {
    const row = toApplicationRow(application(), undefined, 'Started');

    expect(row.meta).toEqual(['1.2.0', 'Started']);
  });

  it('leaves out a cell for a version the application does not declare', () => {
    const row = toApplicationRow(application({ version: undefined }), undefined, 'Stopped');

    expect(row.meta).toEqual(['Stopped']);
  });

  it('carries no meta at all when there is nothing to put in it', () => {
    const row = toApplicationRow(application({ version: undefined }));

    expect(row.meta).toBeUndefined();
  });
});

describe('applicationStateLabelKey', () => {
  it('resolves a phrase key per state', () => {
    expect(applicationStateLabelKey('STARTED')).toBe('applications.state.started');
    expect(applicationStateLabelKey('STOPPED')).toBe('applications.state.stopped');
  });
});
