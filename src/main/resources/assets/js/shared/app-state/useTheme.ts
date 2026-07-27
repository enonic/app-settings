import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $theme, resolveTheme } from './theme.store';

export function useTheme(): void {
  const theme = useStore($theme);

  useEffect(() => {
    const apply = (): void => {
      document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
    };

    apply();

    if (theme !== 'system') {
      return;
    }

    // Only 'system' tracks the OS; an explicit choice stays put.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
