import { afterEach, describe, expect, it } from 'vitest';

import type { ToolConfig } from './config';
import { $config, isAppsManagedMode, setConfig } from './config.store';

const config: ToolConfig = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    events: '/_/app:events',
    graphql: '/_/app:graphql',
    serverApp: {
      start: '/_/server:app/start',
      stop: '/_/server:app/stop',
      uninstall: '/_/server:app/uninstall',
      install: '/_/server:app/install',
      installUrl: '/_/server:app/installUrl',
    },
  },
};

afterEach(() => {
  $config.set(undefined);
});

describe('isAppsManagedMode', () => {
  it('reports managed mode where the tool config carries it', () => {
    setConfig({ ...config, appsManagedMode: true });

    expect(isAppsManagedMode()).toBe(true);
  });

  it('reports no managed mode where the config says so', () => {
    setConfig({ ...config, appsManagedMode: false });

    expect(isAppsManagedMode()).toBe(false);
  });

  it('treats an absent flag as off, so an older island still acts as before', () => {
    setConfig(config);

    expect(isAppsManagedMode()).toBe(false);
  });

  it('treats a config that has not been read yet as off', () => {
    expect(isAppsManagedMode()).toBe(false);
  });
});
