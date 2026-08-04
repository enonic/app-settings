import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { fetchApplication, fetchApplications } from './applications.api';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    events: 'ws:/_/admin:event',
    graphql: '/_/app:graphql',
    serverApp: { start: '/_/server:app/start', stop: '/_/server:app/stop' },
  },
} satisfies ToolConfig;

function respondWith(body: unknown): void {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
}

describe('fetchApplications', () => {
  beforeEach(() => {
    setConfig(config);
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('maps the wire rows to applications', async () => {
    respondWith({
      data: {
        applications: [
          {
            key: 'com.enonic.app.booster',
            displayName: 'Booster',
            description: 'Caches rendered pages',
            version: '1.2.0',
            state: 'STARTED',
            system: false,
            icon: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
            modifiedTime: '2026-05-07T12:42:39Z',
            minSystemVersion: '7.15.0',
            maxSystemVersion: null,
            vendorName: 'Enonic AS',
            vendorUrl: 'https://enonic.com',
          },
        ],
      },
    });

    const result = await fetchApplications();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([
      {
        key: 'com.enonic.app.booster',
        displayName: 'Booster',
        description: 'Caches rendered pages',
        version: '1.2.0',
        state: 'STARTED',
        system: false,
        icon: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        modifiedTime: '2026-05-07T12:42:39Z',
        minSystemVersion: '7.15.0',
        maxSystemVersion: undefined,
        vendorName: 'Enonic AS',
        vendorUrl: 'https://enonic.com',
      },
    ]);
  });

  it('turns the nulls the schema allows into absent fields', async () => {
    respondWith({
      data: {
        applications: [
          {
            key: 'com.enonic.app.fathom',
            displayName: 'Fathom',
            description: null,
            version: null,
            state: 'STOPPED',
            system: true,
            icon: null,
            modifiedTime: null,
            minSystemVersion: null,
            maxSystemVersion: null,
            vendorName: null,
            vendorUrl: null,
          },
        ],
      },
    });

    const result = await fetchApplications();

    expect(result._unsafeUnwrap()).toEqual([
      {
        key: 'com.enonic.app.fathom',
        displayName: 'Fathom',
        description: undefined,
        version: undefined,
        state: 'STOPPED',
        system: true,
        icon: undefined,
        modifiedTime: undefined,
        minSystemVersion: undefined,
        maxSystemVersion: undefined,
        vendorName: undefined,
        vendorUrl: undefined,
      },
    ]);
  });

  it('fails with the message a GraphQL error carries', async () => {
    respondWith({ errors: [{ message: 'No such field' }] });

    const result = await fetchApplications();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toBe('No such field');
  });
});

describe('fetchApplication', () => {
  beforeEach(() => {
    setConfig(config);
  });

  afterEach(() => {
    $config.set(undefined);
    vi.restoreAllMocks();
  });

  it('maps the wire row to an application', async () => {
    respondWith({
      data: {
        application: {
          key: 'com.enonic.app.booster',
          displayName: 'Booster',
          description: null,
          version: '1.2.0',
          state: 'STOPPED',
          system: false,
          icon: null,
          modifiedTime: null,
          minSystemVersion: null,
          maxSystemVersion: null,
        },
      },
    });

    const result = await fetchApplication('com.enonic.app.booster');

    expect(result._unsafeUnwrap()).toMatchObject({
      key: 'com.enonic.app.booster',
      displayName: 'Booster',
      state: 'STOPPED',
    });
  });

  it('resolves to undefined for an application that is not installed', async () => {
    respondWith({ data: { application: null } });

    const result = await fetchApplication('com.enonic.app.gone');

    expect(result._unsafeUnwrap()).toBeUndefined();
  });
});
