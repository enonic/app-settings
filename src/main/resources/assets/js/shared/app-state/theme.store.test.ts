import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $theme, cycleTheme, setTheme, type Theme } from './theme.store';

function stubMedia(matches: boolean) {
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

  vi.stubGlobal('window', { matchMedia: () => media });
  return media;
}

async function freshStore() {
  vi.resetModules();
  return import('./theme.store');
}

beforeEach(() => {
  setTheme('system');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('$theme', () => {
  it('starts on the system preference', async () => {
    const fresh = await freshStore();

    expect(fresh.$theme.get()).toBe('system');
  });

  it('replaces the current value on set', () => {
    setTheme('dark');

    expect($theme.get()).toBe('dark');
  });

  it('cycles light, dark, system and back', () => {
    setTheme('light');

    cycleTheme();
    expect($theme.get()).toBe('dark');

    cycleTheme();
    expect($theme.get()).toBe('system');

    cycleTheme();
    expect($theme.get()).toBe('light');
  });

  it('notifies subscribers until they unbind', () => {
    const seen: Theme[] = [];
    const unbind = $theme.subscribe((theme) => seen.push(theme));

    setTheme('light');
    setTheme('dark');
    unbind();
    setTheme('light');

    expect(seen).toEqual(['system', 'light', 'dark']);
  });
});

describe('$resolvedTheme', () => {
  it('follows the OS through a single listener while set to system', async () => {
    const media = stubMedia(true);
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
    media.matches = false;
    media.listener?.();
    unbind();

    expect(seen).toEqual(['dark', 'light']);
  });

  it('ignores the OS once a theme is chosen explicitly', async () => {
    const media = stubMedia(true);
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
    fresh.setTheme('light');
    media.matches = false;
    media.listener?.();
    unbind();

    expect(seen).toEqual(['dark', 'light']);
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
    const media = stubMedia(true);
    const fresh = await freshStore();

    const unbind = fresh.$resolvedTheme.subscribe(() => undefined);
    unbind();
    // Two delays: the computed unmounts first, and only then lets go of $systemTheme.
    vi.advanceTimersByTime(2 * 1001);

    expect(media.listener).toBeUndefined();
  });
});
