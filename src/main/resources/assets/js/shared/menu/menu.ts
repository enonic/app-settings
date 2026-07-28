import type { ResolvedTheme } from '../app-state';

type MenuMountOptions = {
  appName?: string;
  autoOpen?: boolean;
  theme?: ResolvedTheme;
};

type XpMenuApi = {
  mount(options?: MenuMountOptions): Promise<HTMLElement>;
  unmount(): void;
};

declare global {
  interface Window {
    XpMenu?: XpMenuApi;
  }
}

export const MENU_LOADER_SCRIPT_ID = 'xp-menu-loader';

const THEME_ATTRIBUTE = 'data-menu-theme';

export type MenuPanelParams = {
  loaderUrl: string | undefined;
  appName: string;
  theme: ResolvedTheme;
  doc?: Document;
  view?: Window;
};

export function menuLoaderSrc(
  loaderUrl: string,
  options: { appName: string; theme: ResolvedTheme },
  baseUrl: string,
): string {
  const url = new URL(loaderUrl, baseUrl);
  url.searchParams.set('appName', options.appName);
  url.searchParams.set('theme', options.theme);
  return url.href;
}

// app-main bakes the theme into the panel markup, so a theme change means a remount.
export function syncMenuPanel({
  loaderUrl,
  appName,
  theme,
  doc = document,
  view = window,
}: MenuPanelParams): void {
  if (!loaderUrl) {
    console.warn('The config carries no menu loader url; the admin menu is unavailable');
    return;
  }

  const loader = doc.getElementById(MENU_LOADER_SCRIPT_ID);

  if (!loader) {
    appendLoader({ loaderUrl, appName, theme, doc });
    return;
  }

  if (loader.getAttribute(THEME_ATTRIBUTE) === theme || !view.XpMenu) {
    return;
  }

  loader.setAttribute(THEME_ATTRIBUTE, theme);
  view.XpMenu.mount({ appName, theme }).catch((error: unknown) => {
    console.error('Failed to remount the admin menu:', error);
  });
}

function appendLoader({
  loaderUrl,
  appName,
  theme,
  doc,
}: {
  loaderUrl: string;
  appName: string;
  theme: ResolvedTheme;
  doc: Document;
}): void {
  const script = doc.createElement('script');
  script.id = MENU_LOADER_SCRIPT_ID;
  script.type = 'module';
  script.setAttribute(THEME_ATTRIBUTE, theme);
  // The loader looks itself up by `script[src=import.meta.url]`, so an absolute src.
  script.src = menuLoaderSrc(loaderUrl, { appName, theme }, doc.baseURI);
  script.onerror = () => {
    console.error(`Failed to load the admin menu from ${script.src}`);
  };
  doc.head.appendChild(script);
}
