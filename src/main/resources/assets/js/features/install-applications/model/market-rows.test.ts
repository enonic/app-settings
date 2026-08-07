import { describe, expect, it } from 'vitest';

import type { MarketApplication } from '../../../entities/market';
import {
  canInstall,
  isMajorUpdate,
  marketStatusLabelKey,
  type MarketRow,
  searchMarketRows,
  toMarketRow,
} from './market-rows';

function marketApplication(overrides: Partial<MarketApplication> = {}): MarketApplication {
  return {
    key: 'com.enonic.app.booster',
    displayName: 'Booster',
    description: 'Caches rendered pages',
    iconUrl: 'https://market.enonic.com/icons/booster.svg',
    pageUrl: 'https://market.enonic.com/vendors/enonic/booster',
    latest: {
      version: '3.0.1',
      downloadUrl: 'https://repo.enonic.com/booster-3.0.1.jar',
      sha512: 'abc',
    },
    versions: [],
    updateAvailable: false,
    ...overrides,
  };
}

function row(overrides: Partial<MarketRow> = {}): MarketRow {
  return {
    key: 'com.enonic.app.booster',
    displayName: 'Booster',
    availableVersion: '1.0.0',
    downloadUrl: 'https://repo.enonic.com/booster-1.0.0.jar',
    status: 'install',
    ...overrides,
  };
}

describe('toMarketRow', () => {
  it('carries the market entry over with the latest version as the available one', () => {
    expect(toMarketRow(marketApplication())).toEqual({
      key: 'com.enonic.app.booster',
      displayName: 'Booster',
      description: 'Caches rendered pages',
      iconUrl: 'https://market.enonic.com/icons/booster.svg',
      pageUrl: 'https://market.enonic.com/vendors/enonic/booster',
      availableVersion: '3.0.1',
      installedVersion: undefined,
      downloadUrl: 'https://repo.enonic.com/booster-3.0.1.jar',
      sha512: 'abc',
      status: 'install',
    });
  });

  it('reads an application this instance does not have as installable', () => {
    const { status } = toMarketRow(marketApplication({ installedVersion: undefined }));

    expect(status).toBe('install');
  });

  it('reads an installed application the market has something newer for as updatable', () => {
    const { status } = toMarketRow(
      marketApplication({ installedVersion: '2.1.0', updateAvailable: true }),
    );

    expect(status).toBe('update');
  });

  it('reads an installed application on the latest version as installed', () => {
    const { status } = toMarketRow(
      marketApplication({ installedVersion: '3.0.1', updateAvailable: false }),
    );

    expect(status).toBe('installed');
  });
});

describe('marketStatusLabelKey', () => {
  it('names one phrase per status', () => {
    expect(marketStatusLabelKey('install')).toBe('applications.dialog.install.install');
    expect(marketStatusLabelKey('update')).toBe('applications.dialog.install.update');
    expect(marketStatusLabelKey('installed')).toBe('applications.dialog.install.installed');
  });
});

describe('canInstall', () => {
  it('answers yes for anything not already on the latest version', () => {
    expect(canInstall(row({ status: 'install' }))).toBe(true);
    expect(canInstall(row({ status: 'update' }))).toBe(true);
  });

  it('answers no for an application on the latest version', () => {
    expect(canInstall(row({ status: 'installed' }))).toBe(false);
  });
});

describe('isMajorUpdate', () => {
  it('answers yes when the major version goes up', () => {
    expect(
      isMajorUpdate(
        row({ status: 'update', installedVersion: '2.1.0', availableVersion: '3.0.1' }),
      ),
    ).toBe(true);
  });

  it('answers no for a minor or patch update', () => {
    expect(
      isMajorUpdate(
        row({ status: 'update', installedVersion: '3.0.1', availableVersion: '3.1.0' }),
      ),
    ).toBe(false);
    expect(
      isMajorUpdate(
        row({ status: 'update', installedVersion: '3.0.1', availableVersion: '3.0.2' }),
      ),
    ).toBe(false);
  });

  it('answers no for a first install, which replaces nothing', () => {
    expect(isMajorUpdate(row({ status: 'install', availableVersion: '3.0.1' }))).toBe(false);
  });

  it('answers no where either version does not start with a number', () => {
    expect(
      isMajorUpdate(
        row({ status: 'update', installedVersion: 'snapshot', availableVersion: '3.0.1' }),
      ),
    ).toBe(false);
    expect(
      isMajorUpdate(
        row({ status: 'update', installedVersion: '2.1.0', availableVersion: 'latest' }),
      ),
    ).toBe(false);
  });
});

describe('searchMarketRows', () => {
  const booster = row({ displayName: 'Booster', description: 'Caches rendered pages' });
  const fathom = row({ key: 'com.enonic.app.fathom', displayName: 'Fathom' });
  const rows = [booster, fathom];

  it('returns every row for an empty or blank query', () => {
    expect(searchMarketRows(rows, '')).toEqual(rows);
    expect(searchMarketRows(rows, '   ')).toEqual(rows);
  });

  it('matches the display name whatever the case', () => {
    expect(searchMarketRows(rows, 'BOOSTER')).toEqual([booster]);
  });

  it('matches the description', () => {
    expect(searchMarketRows(rows, 'rendered')).toEqual([booster]);
  });

  it('leaves the key out of the search', () => {
    expect(searchMarketRows(rows, 'com.enonic')).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchMarketRows(rows, 'guillotine')).toEqual([]);
  });
});
