import { useResolvedTheme } from '@enonic/ui-kit';
import { useEffect } from 'preact/hooks';

import type { ToolConfig } from '../config';
import { syncMenuPanel } from './menu';

export function useMenuPanel({ appId, menuLoaderUrl }: ToolConfig): void {
  const theme = useResolvedTheme();

  useEffect(() => {
    syncMenuPanel({ loaderUrl: menuLoaderUrl, appName: appId, theme });
  }, [appId, menuLoaderUrl, theme]);
}
