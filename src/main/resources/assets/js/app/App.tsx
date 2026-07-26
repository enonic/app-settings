import { useStore } from '@nanostores/preact';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import { $theme, resolveTheme } from '../shared/app-state/theme.store';
import { router } from './router';

export function App() {
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

  return <RouterProvider router={router} />;
}
