import { isAdmin } from '/lib/auth';
import { getAllPhrases } from '/lib/i18n';
import { extensionUrl } from '/lib/xp/admin';
import { apiUrl, assetUrl } from '/lib/xp/portal';

export const CONFIG_SCRIPT_ID = 'settings-config-json';

const ADMIN_APP = 'com.enonic.xp.app.main';

export type ToolConfig = {
  appId: string;
  appVersion: string;
  locale: string;
  /** Whether the visitor holds `role:system.admin`, which no section's `allow` can exclude. */
  isAdmin: boolean;
  assetsUrl: string;
  menuLoaderUrl: string;
  phrases: Record<string, string>;
  apis: {
    /** The hub endpoint: `client.js` under it is the client, the endpoint itself the socket. */
    adminEvents: string;
    extensions: string;
    graphql: string;
  };
};

export function getConfig(locales: string[]): ToolConfig {
  return {
    appId: app.name,
    appVersion: app.version,
    locale: locales[0],
    isAdmin: isAdmin(),
    assetsUrl: assetUrl({ path: '' }),
    menuLoaderUrl: extensionUrl({ application: ADMIN_APP, extension: 'menu-loader' }),
    phrases: getAllPhrases(locales),
    apis: {
      adminEvents: apiUrl({ api: 'admin:events' }),
      extensions: apiUrl({ api: 'admin:extension' }),
      graphql: apiUrl({ api: `${app.name}:graphql` }),
    },
  };
}

export function serializeConfig(config: ToolConfig): string {
  return JSON.stringify(config).replace(/<(\/?script|!--)/gi, '\\u003C$1');
}
