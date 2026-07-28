import { afterEach, describe, expect, it, vi } from 'vitest';

import { MENU_LOADER_SCRIPT_ID, menuLoaderSrc, syncMenuPanel } from './menu';

const LOADER_URL = '/admin/tool/_/admin:extension/com.enonic.xp.app.main:menu-loader';
const BASE_URL = 'https://localhost:8080/admin/tool/com.enonic.app.settings/main';
const APP = 'com.enonic.app.settings';

type Script = HTMLScriptElement & { src?: string };

function stubScript(attributes: Record<string, string> = {}): Script {
  return {
    getAttribute: (name: string) => attributes[name] ?? null,
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
  } as unknown as Script;
}

function stubDocument(loader: Script | null = null) {
  const appended: Script[] = [];

  const doc = {
    baseURI: BASE_URL,
    getElementById: (id: string) =>
      id === MENU_LOADER_SCRIPT_ID ? (loader ?? appended[0] ?? null) : null,
    createElement: () => stubScript(),
    head: { appendChild: (node: Script) => appended.push(node) },
  } as unknown as Document;

  return { doc, appended };
}

function stubView(mount = vi.fn().mockResolvedValue(undefined)) {
  return { view: { XpMenu: { mount, unmount: vi.fn() } } as unknown as Window, mount };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('menuLoaderSrc', () => {
  it('passes the app name and theme the loader reads off its own url', () => {
    const { searchParams } = new URL(
      menuLoaderSrc(LOADER_URL, { appName: APP, theme: 'light' }, BASE_URL),
    );

    expect(searchParams.get('appName')).toBe(APP);
    expect(searchParams.get('theme')).toBe('light');
  });

  it('resolves the server-relative extension url against the page', () => {
    const src = menuLoaderSrc(LOADER_URL, { appName: APP, theme: 'dark' }, BASE_URL);

    expect(src.startsWith(`https://localhost:8080${LOADER_URL}?`)).toBe(true);
  });

  it('keeps query params the extension url already carries', () => {
    const src = menuLoaderSrc(
      `${LOADER_URL}?autoOpen=false`,
      { appName: APP, theme: 'dark' },
      BASE_URL,
    );

    expect(new URL(src).searchParams.get('autoOpen')).toBe('false');
  });
});

describe('syncMenuPanel', () => {
  it('loads the panel through an absolute module url, which is how the loader finds itself', () => {
    const { doc, appended } = stubDocument();

    syncMenuPanel({
      loaderUrl: LOADER_URL,
      appName: APP,
      theme: 'dark',
      doc,
      view: stubView().view,
    });

    expect(appended).toHaveLength(1);
    expect(appended[0].type).toBe('module');
    expect(appended[0].src).toBe(
      menuLoaderSrc(LOADER_URL, { appName: APP, theme: 'dark' }, BASE_URL),
    );
  });

  it('remounts with the new theme, since the panel markup carries it', () => {
    const loader = stubScript({ 'data-menu-theme': 'dark' });
    const { doc, appended } = stubDocument(loader);
    const { view, mount } = stubView();

    syncMenuPanel({ loaderUrl: LOADER_URL, appName: APP, theme: 'light', doc, view });

    expect(mount).toHaveBeenCalledWith({ appName: APP, theme: 'light' });
    expect(appended).toEqual([]);
    expect(loader.getAttribute('data-menu-theme')).toBe('light');
  });

  it('leaves a panel that already shows the wanted theme alone', () => {
    const { doc, appended } = stubDocument(stubScript({ 'data-menu-theme': 'dark' }));
    const { view, mount } = stubView();

    syncMenuPanel({ loaderUrl: LOADER_URL, appName: APP, theme: 'dark', doc, view });

    expect(mount).not.toHaveBeenCalled();
    expect(appended).toEqual([]);
  });

  it('records no theme it could not apply while the loader is still loading', () => {
    const { doc, appended } = stubDocument();
    const view = {} as Window;

    syncMenuPanel({ loaderUrl: LOADER_URL, appName: APP, theme: 'dark', doc, view });
    syncMenuPanel({ loaderUrl: LOADER_URL, appName: APP, theme: 'light', doc, view });

    expect(appended).toHaveLength(1);
    expect(appended[0].getAttribute('data-menu-theme')).toBe('dark');
  });

  it('warns and moves on when the config has no loader url', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { doc, appended } = stubDocument();

    syncMenuPanel({
      loaderUrl: undefined,
      appName: APP,
      theme: 'dark',
      doc,
      view: stubView().view,
    });

    expect(appended).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('reports a loader that fails to load instead of leaving the corner empty', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { doc, appended } = stubDocument();

    syncMenuPanel({
      loaderUrl: LOADER_URL,
      appName: APP,
      theme: 'dark',
      doc,
      view: stubView().view,
    });
    appended[0].onerror?.(new Event('error'));

    expect(error).toHaveBeenCalledWith(expect.stringContaining(LOADER_URL));
  });

  it('reports a failed remount instead of leaving the rejection unhandled', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rejection = new Error('offline');
    const { doc } = stubDocument(stubScript({ 'data-menu-theme': 'dark' }));
    const { view } = stubView(vi.fn().mockRejectedValue(rejection));

    syncMenuPanel({ loaderUrl: LOADER_URL, appName: APP, theme: 'light', doc, view });
    await vi.waitFor(() => expect(error).toHaveBeenCalled());

    expect(error.mock.calls[0][1]).toBe(rejection);
  });
});
