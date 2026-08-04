import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Application, ApplicationState } from '../../../entities/application';
import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { isStartable, isStoppable } from './application-lifecycle';

const OWN_APP = 'com.enonic.xp.app.settings';

const config = {
  appId: OWN_APP,
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

function application(key: string, state: ApplicationState, system = false): Application {
  return { key, displayName: key, version: '1.0.0', state, system };
}

beforeEach(() => {
  setConfig(config);
});

afterEach(() => {
  $config.set(undefined);
});

describe('isStartable', () => {
  it('accepts a stopped application, platform-bundled or not', () => {
    expect(isStartable(application('com.enonic.app.fathom', 'STOPPED'))).toBe(true);
    expect(isStartable(application('com.enonic.xp.app.system', 'STOPPED', true))).toBe(true);
  });

  it('refuses one that is already started', () => {
    expect(isStartable(application('com.enonic.app.booster', 'STARTED'))).toBe(false);
  });
});

describe('isStoppable', () => {
  it('accepts a started application of its own', () => {
    expect(isStoppable(application('com.enonic.app.booster', 'STARTED'))).toBe(true);
  });

  it('refuses one that is already stopped', () => {
    expect(isStoppable(application('com.enonic.app.fathom', 'STOPPED'))).toBe(false);
  });

  it('refuses a platform-bundled application', () => {
    expect(isStoppable(application('com.enonic.xp.app.system', 'STARTED', true))).toBe(false);
  });

  it('refuses the application this tool runs from', () => {
    expect(isStoppable(application(OWN_APP, 'STARTED'))).toBe(false);
  });
});
