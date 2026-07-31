import { atom, computed, onMount } from 'nanostores';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export const $theme = atom<Theme>('system');

export function setTheme(theme: Theme): void {
  $theme.set(theme);
}

const THEME_CYCLE: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function cycleTheme(): void {
  setTheme(THEME_CYCLE[$theme.get()]);
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

const $systemTheme = atom<ResolvedTheme>(systemTheme());

onMount($systemTheme, () => {
  if (typeof window === 'undefined') {
    return;
  }

  const media = window.matchMedia(DARK_QUERY);
  const sync = (): void => $systemTheme.set(media.matches ? 'dark' : 'light');

  sync();
  media.addEventListener('change', sync);
  return () => media.removeEventListener('change', sync);
});

export const $resolvedTheme = computed([$theme, $systemTheme], (theme, system) =>
  theme === 'system' ? system : theme,
);
