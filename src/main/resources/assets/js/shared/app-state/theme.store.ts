import { atom, computed, onMount } from 'nanostores';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Shared with Content Studio and the admin menu, which read the same entry. */
const THEME_STORAGE_KEY = 'enonic:theme';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function storedTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system';
  }
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export const $theme = atom<Theme>(storedTheme());

const $systemTheme = atom<ResolvedTheme>(systemTheme());

export const $resolvedTheme = computed([$theme, $systemTheme], (theme, system) =>
  theme === 'system' ? system : theme,
);

export function setTheme(theme: Theme): void {
  $theme.set(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error: unknown) {
    console.error(`Failed to store the theme under ${THEME_STORAGE_KEY}:`, error);
  }
}

export function cycleTheme(): void {
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
  setTheme(next[$theme.get()]);
}

onMount($theme, () => {
  if (typeof window === 'undefined') {
    return;
  }

  // Another tab switched: the entry is the source of truth, not this tab's atom.
  const sync = (event: StorageEvent): void => {
    if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
      $theme.set(event.newValue);
    }
  };

  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
});

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
