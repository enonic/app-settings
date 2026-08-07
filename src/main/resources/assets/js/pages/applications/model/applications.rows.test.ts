import { describe, expect, it } from 'vitest';

import type { Application } from '../../../entities/application';
import type { MarketApplication } from '../../../entities/market';
import { applicationStateLabelKey, availableVersions, toApplicationRow } from './applications.rows';

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

function marketApplication(
  key: string,
  latestVersion: string,
  updateAvailable: boolean,
): MarketApplication {
  const latest = { version: latestVersion, downloadUrl: `https://repo.enonic.com/${key}.jar` };
  return { key, displayName: key, latest, versions: [latest], updateAvailable };
}

describe('toApplicationRow', () => {
  it('keys the row by the application key and puts the description under the name', () => {
    const row = toApplicationRow(application());

    expect(row.key).toBe('com.enonic.app.booster');
    expect(row.title).toBe('Booster');
    expect(row.subtitle).toBe('Caches rendered pages');
  });

  it('shows the version cell the page supplied and the state label, state last', () => {
    const row = toApplicationRow(application(), undefined, 'Started', 'Installed: 1.2.0');

    expect(row.meta).toEqual(['Installed: 1.2.0', 'Started']);
  });

  it('leaves out the version cell where the page supplied none', () => {
    const row = toApplicationRow(application(), undefined, 'Stopped');

    expect(row.meta).toEqual(['Stopped']);
  });

  it('carries no meta at all when there is nothing to put in it', () => {
    const row = toApplicationRow(application());

    expect(row.meta).toBeUndefined();
  });
});

describe('availableVersions', () => {
  it('reports the newer version per application key', () => {
    const market = [marketApplication('com.enonic.app.booster', '1.4.0', true)];

    expect(availableVersions(market).get('com.enonic.app.booster')).toBe('1.4.0');
  });

  it('leaves out an application the instance is already up to date on', () => {
    const market = [marketApplication('com.enonic.app.booster', '1.2.0', false)];

    expect(availableVersions(market).has('com.enonic.app.booster')).toBe(false);
  });

  it('reads nothing from a catalogue that has not loaded', () => {
    expect(availableVersions([]).size).toBe(0);
  });
});

describe('applicationStateLabelKey', () => {
  it('resolves a phrase key per state', () => {
    expect(applicationStateLabelKey('STARTED')).toBe('applications.state.started');
    expect(applicationStateLabelKey('STOPPED')).toBe('applications.state.stopped');
  });
});
