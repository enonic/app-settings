import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('$resolvedTheme', () => {
  it('follows the OS through a single listener', async () => {
    const media = stubMedia(true);
    const fresh = await freshStore();

    const seen: string[] = [];
    const unbind = fresh.$resolvedTheme.subscribe((theme) => seen.push(theme));
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
    // nanostores unmounts a store a tick after its last listener leaves.
    vi.advanceTimersByTime(1001);

    expect(media.listener).toBeUndefined();
  });
});
