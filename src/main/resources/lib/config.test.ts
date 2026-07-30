import { extensionUrl } from '/lib/xp/admin';
import { getPhrases } from '/lib/xp/i18n';
import { apiUrl, assetUrl } from '/lib/xp/portal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfig, serializeConfig, type ToolConfig } from './config';

const config: ToolConfig = {
  appId: 'com.enonic.app.settings',
  appVersion: '1.0.0',
  locale: 'en',
  assetsUrl: '/admin/tool/_/asset/com.enonic.app.settings',
  menuLoaderUrl: '/admin/tool/_/admin:extension/com.enonic.xp.app.main:menu-loader',
  phrases: { 'nav.users': 'Users' },
  apis: {
    events: '/admin/tool/com.enonic.app.settings/main/_/com.enonic.app.settings:events',
    graphql: '/admin/tool/com.enonic.app.settings/main/_/com.enonic.app.settings:graphql',
  },
};

describe('getConfig', () => {
  beforeEach(() => {
    vi.stubGlobal('app', { name: 'com.enonic.app.settings', version: '1.0.0' });
    vi.mocked(getPhrases).mockReturnValue({ 'nav.users': 'Users' });
    vi.mocked(assetUrl).mockReturnValue('/assets');
    vi.mocked(extensionUrl).mockImplementation(
      ({ application, extension }) => `/_/admin:extension/${application}:${extension}`,
    );
    vi.mocked(apiUrl).mockImplementation(
      ({ api, type }) => `${type === 'websocket' ? 'ws:' : ''}/_/${api}`,
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

  it('points at the built-in admin:event api as a websocket url', () => {
    expect(getConfig(['en']).apis.events).toBe('ws:/_/admin:event');
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith({ api: 'admin:event', type: 'websocket' });
  });

  it('addresses the app-owned graphql api by its qualified key', () => {
    expect(getConfig(['en']).apis.graphql).toBe('/_/com.enonic.app.settings:graphql');
    expect(vi.mocked(apiUrl)).toHaveBeenCalledWith({ api: 'com.enonic.app.settings:graphql' });
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
