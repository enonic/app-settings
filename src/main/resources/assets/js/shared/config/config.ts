import { AppError } from '../api';

export type ApiUrls = {
  events: string;
  extensions: string;
  graphql: string;
  serverApp: {
    start: string;
    stop: string;
    uninstall: string;
    install: string;
    installUrl: string;
  };
};

export type ToolConfig = {
  appId: string;
  appVersion: string;
  locale: string;
  isAdmin?: boolean;
  assetsUrl: string;
  menuLoaderUrl?: string;
  appsManagedMode?: boolean;
  phrases: Readonly<Record<string, string>>;
  apis: ApiUrls;
};

function isToolConfig(value: unknown): value is ToolConfig {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const { appId, locale, phrases, apis } = value as Partial<ToolConfig>;
  return (
    typeof appId === 'string' &&
    typeof locale === 'string' &&
    phrases != null &&
    typeof phrases === 'object' &&
    apis != null &&
    typeof apis.events === 'string' &&
    typeof apis.extensions === 'string' &&
    typeof apis.graphql === 'string' &&
    apis.serverApp != null &&
    typeof apis.serverApp.start === 'string' &&
    typeof apis.serverApp.stop === 'string' &&
    typeof apis.serverApp.uninstall === 'string' &&
    typeof apis.serverApp.install === 'string' &&
    typeof apis.serverApp.installUrl === 'string'
  );
}

export function readConfig(doc: Document = document): ToolConfig {
  const loader = doc.querySelector('script[data-config-script-id]');
  const scriptId = loader?.getAttribute('data-config-script-id');
  if (!scriptId) {
    throw new AppError('No script carries a data-config-script-id attribute');
  }

  const island = doc.getElementById(scriptId);
  if (!island?.textContent) {
    throw new AppError(`Config script #${scriptId} is missing or empty`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(island.textContent);
  } catch (error) {
    throw new AppError(`Config script #${scriptId} is not valid JSON`, error);
  }

  if (!isToolConfig(parsed)) {
    throw new AppError(`Config script #${scriptId} does not describe a tool config`);
  }

  return parsed;
}
