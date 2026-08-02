import { getAllPhrases } from '/lib/i18n';
import { extensionUrl } from '/lib/xp/admin';
import { apiUrl, assetUrl } from '/lib/xp/portal';

export const CONFIG_SCRIPT_ID = 'settings-config-json';

const ADMIN_APP = 'com.enonic.xp.app.main';

export type ToolConfig = {
  appId: string;
  appVersion: string;
  locale: string;
  assetsUrl: string;
  menuLoaderUrl: string;
  phrases: Record<string, string>;
  apis: {
    events: string;
    graphql: string;
  };
};

export function getConfig(locales: string[]): ToolConfig {
  return {
    appId: app.name,
    appVersion: app.version,
    locale: locales[0],
    assetsUrl: assetUrl({ path: '' }),
    menuLoaderUrl: extensionUrl({ application: ADMIN_APP, extension: 'menu-loader' }),
    phrases: getAllPhrases(locales),
    apis: {
      events: apiUrl({ api: 'admin:event', type: 'websocket' }),
      graphql: apiUrl({ api: `${app.name}:graphql` }),
    },
  };
}

export function serializeConfig(config: ToolConfig): string {
  return JSON.stringify(config).replace(/<(\/?script|!--)/gi, '\\u003C$1');
}
