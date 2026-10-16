import { afterEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'enonic:theme';

function stubWindow(matches: boolean, stored: Record<string, string> = {}) {
  const media = {
    matches,
    listener: undefined as (() => void) | undefined,
    addEventListener: (_: string, cb: () => void) => {
      media.listener = cb;
    },
    removeEventListener: () => {
      media.listener = undefined;
    },
  };

  const win = {
    matchMedia: () => media,
    localStorage: {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => {
        stored[key] = value;
      },
    },
    storageListener: undefined as ((event: StorageEvent) => void) | undefined,
    addEventListener: (_: string, cb: (event: StorageEvent) => void) => {
      win.storageListener = cb;
    },
    removeEventListener: () => {
      win.storageListener = undefined;
    },
  };

  vi.stubGlobal('window', win);
  return { media, stored, win };
}

async function freshStore() {
  vi.resetModules();
  return import('./theme.store');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('$theme', () => {
  it('starts from the stored preference', async () => {
    stubWindow(false, { [STORAGE_KEY]: 'dark' });
    const fresh = await freshStore();

    expect(fresh.$theme.get()).toBe('dark');
  });

  it('defaults to the system preference when nothing valid is stored', async () => {
    stubWindow(false, { [STORAGE_KEY]: 'blue' });
    const fresh = await freshStore();

    expect(fresh.$theme.get()).toBe('system');
  });

  it('stores the preference it is set to', async () => {
    const { stored } = stubWindow(false);
    const fresh = await freshStore();

    fresh.setTheme('light');

    expect(stored[STORAGE_KEY]).toBe('light');
  });

  it('cycles light, dark, system', async () => {
    stubWindow(false, { [STORAGE_KEY]: 'light' });
    const fresh = await freshStore();

    const seen: string[] = [];
    fresh.cycleTheme();
    seen.push(fresh.$theme.get());
    fresh.cycleTheme();
    seen.push(fresh.$theme.get());
    fresh.cycleTheme();
    seen.push(fresh.$theme.get());

    expect(seen).toEqual(['dark', 'system', 'light']);
  });

  it('follows a switch made in another tab', async () => {
    const { win } = stubWindow(false);
    const fresh = await freshStore();

    const unbind = fresh.$theme.subscribe(() => undefined);
    win.storageListener?.({ key: STORAGE_KEY, newValue: 'dark' } as StorageEvent);
    const theme = fresh.$theme.get();
    unbind();

    expect(theme).toBe('dark');
  });
});

describe('$resolvedTheme', () => {
  it('follows the OS through a single listener', async () => {
    const { media } = stubWindow(true);
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
    media.matches = false;
    media.listener?.();
    unbind();

    expect(seen).toEqual(['dark', 'light']);
  });

  it('ignores the OS once a theme is chosen', async () => {
    const { media } = stubWindow(true, { [STORAGE_KEY]: 'light' });
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
    media.matches = false;
    media.listener?.();
    fresh.setTheme('dark');
    unbind();

    expect(seen).toEqual(['light', 'dark']);
  });

  it('falls back to light where there is no window', async () => {
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
    unbind();

    expect(seen).toEqual(['light']);
  });

  it('drops the OS listener once nothing reads the theme', async () => {
    vi.useFakeTimers();
    const { media } = stubWindow(true);
    const fresh = await freshStore();

    const unbind = fresh.$resolvedTheme.subscribe(() => undefined);
    unbind();
    // nanostores unmounts a store a tick after its last listener leaves, and the computed
    // releases its sources only once it has unmounted itself.
    vi.advanceTimersByTime(2002);

    expect(media.listener).toBeUndefined();
  });
});
