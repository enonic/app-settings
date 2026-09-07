import { atom, onMount } from 'nanostores';

export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export const $resolvedTheme = atom<ResolvedTheme>(systemTheme());

onMount($resolvedTheme, () => {
  if (typeof window === 'undefined') {
    return;
  }

  const media = window.matchMedia(DARK_QUERY);
  const sync = (): void => $resolvedTheme.set(media.matches ? 'dark' : 'light');

  sync();
  media.addEventListener('change', sync);
  return () => media.removeEventListener('change', sync);
});
