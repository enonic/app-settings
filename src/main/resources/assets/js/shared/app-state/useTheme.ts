import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $resolvedTheme } from './theme.store';

export function useTheme(): void {
  const theme = useStore($resolvedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
