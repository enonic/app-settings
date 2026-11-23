import { useResolvedTheme } from '@enonic/ui-kit';
import { useEffect } from 'preact/hooks';

export function useTheme(): void {
  const theme = useResolvedTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  }, [theme]);
}
