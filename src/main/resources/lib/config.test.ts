import { extensionUrl } from '/lib/xp/admin';
import { hasRole } from '/lib/xp/auth';
import { getPhrases } from '/lib/xp/i18n';
import { apiUrl, assetUrl } from '/lib/xp/portal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfig, serializeConfig, type ToolConfig } from './config';

const config: ToolConfig = {
  appId: 'com.enonic.xp.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  isAdmin: true,
  assetsUrl: '/admin/tool/_/asset/com.enonic.xp.app.settings',
  menuLoaderUrl: '/admin/tool/_/admin:extension/com.enonic.xp.app.main:menu-loader',
  phrases: { 'nav.users': 'Users' },
  apis: {
    adminEvents: '/admin/tool/com.enonic.xp.app.settings/main/_/admin:events',
    extensions: '/admin/tool/com.enonic.xp.app.settings/main/_/admin:extension',
    graphql: '/admin/tool/com.enonic.xp.app.settings/main/_/com.enonic.xp.app.settings:graphql',
    serverApp: {
      start: '/admin/tool/com.enonic.xp.app.settings/main/_/server:app/start',
      stop: '/admin/tool/com.enonic.xp.app.settings/main/_/server:app/stop',
      uninstall: '/admin/tool/com.enonic.xp.app.settings/main/_/server:app/uninstall',
      install: '/admin/tool/com.enonic.xp.app.settings/main/_/server:app/install',
      installUrl: '/admin/tool/com.enonic.xp.app.settings/main/_/server:app/installUrl',
    },
  },
};

function withAppConfig(appConfig: Record<string, string>): void {
  vi.stubGlobal('app', {
    name: 'com.enonic.xp.app.settings',
    version: '1.0.0',
    config: appConfig,
  });
}

describe('getConfig', () => {
  beforeEach(() => {
    withAppConfig({});
    vi.mocked(getPhrases).mockReturnValue({ 'nav.users': 'Users' });
    vi.mocked(hasRole).mockReturnValue(true);
    vi.mocked(assetUrl).mockReturnValue('/assets');
    vi.mocked(extensionUrl).mockImplementation(
      ({ application, extension }) => `/_/admin:extension/${application}:${extension}`,
    );
    vi.mocked(apiUrl).mockImplementation(
      ({ api, type, path }) =>
        `${type === 'websocket' ? 'ws:' : ''}/_/${api}${path == null ? '' : `/${String(path)}`}`,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('inlines the phrases so the browser needs no extra request', () => {
    expect(getConfig(['en']).phrases).toEqual({ 'nav.users': 'Users' });
  });

  it('reports the first requested locale', () => {
    expect(getConfig(['no', 'en']).locale).toBe('no');
  });

  it('points at the menu loader extension of the admin app', () => {
    expect(getConfig(['en']).menuLoaderUrl).toBe(
      '/_/admin:extension/com.enonic.xp.app.main:menu-loader',
    );
    expect(vi.mocked(extensionUrl)).toHaveBeenCalledWith({
      application: 'com.enonic.xp.app.main',
      extension: 'menu-loader',
    });
  });

  it('points at the admin events hub, whose endpoint serves its own client', () => {
    expect(getConfig(['en']).apis.adminEvents).toBe('/_/admin:events');
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith({ api: 'admin:events' });
  });

  it('points at the built-in admin:extension api, which serves the section extensions', () => {
    expect(getConfig(['en']).apis.extensions).toBe('/_/admin:extension');
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith({ api: 'admin:extension' });
  });

  it('addresses the app-owned graphql api by its qualified key', () => {
    expect(getConfig(['en']).apis.graphql).toBe('/_/com.enonic.xp.app.settings:graphql');
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith({ api: 'com.enonic.xp.app.settings:graphql' });
  });

  it('reports whether the visitor is a system admin', () => {
    vi.mocked(hasRole).mockReturnValue(false);

    expect(getConfig(['en']).isAdmin).toBe(false);
    expect(vi.mocked(hasRole)).toHaveBeenCalledWith('role:system.admin');
  });

  it('points at the lifecycle endpoints of the built-in server:app api', () => {
    expect(getConfig(['en']).apis.serverApp).toEqual({
      start: '/_/server:app/start',
      stop: '/_/server:app/stop',
      uninstall: '/_/server:app/uninstall',
      install: '/_/server:app/install',
      installUrl: '/_/server:app/installUrl',
    });
  });
});

describe('serializeConfig', () => {
  it('round-trips the config through JSON', () => {
    expect(JSON.parse(serializeConfig(config))).toEqual(config);
  });

  it('escapes a closing script tag so it cannot break out of the JSON island', () => {
    const hostile = { ...config, appVersion: '</script><img src=x>' };

    const serialized = serializeConfig(hostile);

    expect(serialized).not.toContain('</script');
    expect(serialized).toContain('\\u003C/script');
    expect(JSON.parse(serialized)).toEqual(hostile);
  });

  it('escapes an HTML comment opener', () => {
    const serialized = serializeConfig({ ...config, appVersion: '<!--' });

    expect(serialized).not.toContain('<!--');
    expect(serialized).toContain('\\u003C!--');
  });
});
