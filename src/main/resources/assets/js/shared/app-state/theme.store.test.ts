import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $theme, resolveTheme, setTheme, type Theme } from './theme.store';

beforeEach(() => {
  setTheme('system');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme store', () => {
  it('starts on the system preference', async () => {
    vi.resetModules();
    const fresh = await import('./theme.store');

    expect(fresh.$theme.get()).toBe('system');
  });

  it('replaces the current value on set', () => {
    setTheme('dark');

    expect($theme.get()).toBe('dark');
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

  it('passes explicit choices through unresolved', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('follows the OS preference when set to system', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(resolveTheme('system')).toBe('dark');

    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(resolveTheme('system')).toBe('light');
  });

  it('falls back to light where there is no window', () => {
    expect(resolveTheme('system')).toBe('light');
  });
});
