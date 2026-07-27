import { getAllPhrases } from '/lib/i18n';
import { apiUrl, assetUrl } from '/lib/xp/portal';

export const CONFIG_SCRIPT_ID = 'settings-config-json';

export type ToolConfig = {
  appId: string;
  appVersion: string;
  locale: string;
  assetsUrl: string;
  phrases: Record<string, string>;
  apis: {
    events: string;
  };
};

export function getConfig(locales: string[]): ToolConfig {
  return {
    appId: app.name,
    appVersion: app.version,
    locale: locales[0],
    assetsUrl: assetUrl({ path: '' }),
    phrases: getAllPhrases(locales),
    apis: {
      events: apiUrl({ api: 'admin:event', type: 'websocket' }),
    },
  };
}

export function serializeConfig(config: ToolConfig): string {
  return JSON.stringify(config).replace(/<(\/?script|!--)/gi, '\\u003C$1');
}
