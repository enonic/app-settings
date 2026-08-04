import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Application,
  type ApplicationState,
  startApplications,
  stopApplications,
} from '../../../entities/application';
import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import type { ActionContext, SectionAction } from '../../../widgets/browse-toolbar/actions';
import { APPLICATION_ACTIONS } from './applications.actions';

vi.mock('../../../entities/application', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../entities/application')>()),
  startApplications: vi.fn(),
  stopApplications: vi.fn(),
}));

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

const booster = application('com.enonic.app.booster', 'STARTED');
const fathom = application('com.enonic.app.fathom', 'STOPPED');
const systemApp = application('com.enonic.xp.app.system', 'STARTED', true);
const ownApp = application(OWN_APP, 'STARTED');

function context(overrides: Partial<ActionContext<Application>> = {}): ActionContext<Application> {
  return { selected: [], active: undefined, ...overrides };
}

function action(id: string): SectionAction<Application> {
  const found = APPLICATION_ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`No application action with id ${id}`);
  }
  return found;
}

beforeEach(() => {
  setConfig(config);
  vi.mocked(startApplications).mockReset();
  vi.mocked(stopApplications).mockReset();
});

afterEach(() => {
  $config.set(undefined);
});

describe('application actions', () => {
  it('offers install, uninstall, start and stop in that order', () => {
    expect(APPLICATION_ACTIONS.map(({ id }) => id)).toEqual([
      'install',
      'uninstall',
      'start',
      'stop',
    ]);
  });
});

describe('install and uninstall application', () => {
  it('stay disabled until #3 implements them, whatever is selected', () => {
    expect(action('install').enabled(context())).toBe(false);
    expect(action('install').enabled(context({ selected: [booster] }))).toBe(false);
    expect(action('uninstall').enabled(context())).toBe(false);
    expect(action('uninstall').enabled(context({ selected: [booster] }))).toBe(false);
  });
});

describe('start application', () => {
  it('needs a target', () => {
    expect(action('start').enabled(context())).toBe(false);
  });

  it('starts a stopped target, ticked or merely active', () => {
    expect(action('start').enabled(context({ selected: [fathom] }))).toBe(true);
    expect(action('start').enabled(context({ active: fathom }))).toBe(true);
  });

  it('refuses one that is already started', () => {
    expect(action('start').enabled(context({ selected: [booster] }))).toBe(false);
  });

  it('starts only the stopped ones out of a mixed selection', () => {
    const ctx = context({ selected: [booster, fathom] });

    expect(action('start').enabled(ctx)).toBe(true);
    void action('start').run(ctx);

    expect(startApplications).toHaveBeenCalledWith([fathom]);
  });
});

describe('stop application', () => {
  it('needs a target', () => {
    expect(action('stop').enabled(context())).toBe(false);
  });

  it('stops a started target, ticked or merely active', () => {
    expect(action('stop').enabled(context({ selected: [booster] }))).toBe(true);
    expect(action('stop').enabled(context({ active: booster }))).toBe(true);
  });

  it('refuses one that is already stopped', () => {
    expect(action('stop').enabled(context({ selected: [fathom] }))).toBe(false);
  });

  it('refuses a selection of nothing but platform and own applications', () => {
    expect(action('stop').enabled(context({ selected: [systemApp, ownApp] }))).toBe(false);
  });

  it('leaves the platform application and this tool out of a mixed selection', () => {
    const ctx = context({ selected: [booster, fathom, systemApp, ownApp] });

    expect(action('stop').enabled(ctx)).toBe(true);
    void action('stop').run(ctx);

    expect(stopApplications).toHaveBeenCalledWith([booster]);
  });
});
