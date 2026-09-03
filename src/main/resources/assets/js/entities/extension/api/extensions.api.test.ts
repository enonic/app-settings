import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $config, setConfig, type ToolConfig } from '../../../shared/config';
import { fetchSectionExtensions } from './extensions.api';

const config = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/assets',
  phrases: {},
  apis: {
    adminEvents: '/_/admin:events',
    extensions: '/admin/tool/settings/main/_/admin:extension',
  },
} satisfies ToolConfig;

const BASE = config.apis.extensions;

let requested: string | undefined;

function respondWith(rows: unknown): void {
  globalThis.fetch = vi.fn((url: unknown) => {
    requested = String(url);
    return Promise.resolve(new Response(JSON.stringify(rows)));
  }) as unknown as typeof globalThis.fetch;
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    key: 'com.enonic.xp.app.applications:section',
    title: 'Applications',
    url: 'com.enonic.xp.app.applications:section',
    iconUrl: '?icon&app=com.enonic.xp.app.applications&extension=section&v=1',
    config: { order: 10, path: 'applications' },
    ...overrides,
  };
}

describe('fetchSectionExtensions', () => {
  beforeEach(() => {
    setConfig(config);
    requested = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    $config.set(undefined);
  });

  it('asks the discovery endpoint for the interface the tool publishes', async () => {
    respondWith([]);

    await fetchSectionExtensions();

    expect(requested).toBe(`${BASE}?interface=settings.section`);
  });

  it('puts a separator in front of the descriptor key that arrives as `url`', async () => {
    respondWith([row()]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap()[0].url).toBe(`${BASE}/com.enonic.xp.app.applications:section`);
  });

  it('points the module url at the entry path the contract fixes', async () => {
    respondWith([row()]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap()[0].moduleUrl).toBe(
      `${BASE}/com.enonic.xp.app.applications:section/_static/main.js`,
    );
  });

  it('appends the icon query string without one, since it carries its own', async () => {
    respondWith([row()]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap()[0].iconUrl).toBe(
      `${BASE}?icon&app=com.enonic.xp.app.applications&extension=section&v=1`,
    );
  });

  it('reads the slug and the order off the descriptor config', async () => {
    respondWith([row()]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap()[0]).toMatchObject({ order: 10, path: 'applications' });
  });

  it('sorts a section with no order after the ones that name one', async () => {
    respondWith([
      row({ key: 'c:one', url: 'c:one', config: {} }),
      row({ key: 'b:two', url: 'b:two', config: { order: 20 } }),
    ]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap().map(({ key }) => key)).toEqual(['b:two', 'c:one']);
  });

  it('breaks a tie on the key rather than on the localized title', async () => {
    respondWith([
      row({ key: 'z:section', url: 'z:section', title: 'Aaa', config: { order: 10 } }),
      row({ key: 'a:section', url: 'a:section', title: 'Zzz', config: { order: 10 } }),
    ]);

    const result = await fetchSectionExtensions();

    expect(result._unsafeUnwrap().map(({ key }) => key)).toEqual(['a:section', 'z:section']);
  });

  // The contract lets one module serve every section an app ships; the host points the group at
  // the first row so the browser imports one URL — see `shareModules`.
  it("shares one module among an app's sections, keeping each section's own prefix", async () => {
    respondWith([
      row({ key: 'app.users:groups', url: 'app.users:groups', config: { order: 21 } }),
      row({ key: 'app.users:users', url: 'app.users:users', config: { order: 20 } }),
    ]);

    const result = await fetchSectionExtensions();
    const [users, groups] = result._unsafeUnwrap();

    expect(users.moduleUrl).toBe(`${BASE}/app.users:users/_static/main.js`);
    expect(groups.moduleUrl).toBe(`${BASE}/app.users:users/_static/main.js`);
    expect(groups.url).toBe(`${BASE}/app.users:groups`);
  });

  it('never groups across applications', async () => {
    respondWith([
      row({ key: 'app.users:users', url: 'app.users:users', config: { order: 20 } }),
      row({ key: 'app.license:license', url: 'app.license:license', config: { order: 30 } }),
    ]);

    const result = await fetchSectionExtensions();
    const [users, license] = result._unsafeUnwrap();

    expect(users.moduleUrl).toBe(`${BASE}/app.users:users/_static/main.js`);
    expect(license.moduleUrl).toBe(`${BASE}/app.license:license/_static/main.js`);
  });

  it('lets a section opt out of the app group by naming its own config.module', async () => {
    respondWith([
      row({ key: 'app.users:users', url: 'app.users:users', config: { order: 20 } }),
      row({ key: 'app.users:groups', url: 'app.users:groups', config: { order: 21 } }),
      row({
        key: 'app.users:audit',
        url: 'app.users:audit',
        config: { order: 22, module: 'audit' },
      }),
    ]);

    const result = await fetchSectionExtensions();
    const [, groups, audit] = result._unsafeUnwrap();

    expect(groups.moduleUrl).toBe(`${BASE}/app.users:users/_static/main.js`);
    expect(audit.moduleUrl).toBe(`${BASE}/app.users:audit/_static/main.js`);
  });

  it('fails before the network when the tool config has not been read', async () => {
    $config.set(undefined);
    respondWith([]);

    const result = await fetchSectionExtensions();

    expect(result.isErr()).toBe(true);
    expect(requested).toBeUndefined();
  });
});
