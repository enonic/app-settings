import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $resolvedTheme } from '../app-state';
import type { ToolConfig } from '../config';
import { syncMenuPanel } from './menu';

export function useMenuPanel({ appId, menuLoaderUrl }: ToolConfig): void {
  const theme = useStore($resolvedTheme);

  useEffect(() => {
    syncMenuPanel({ loaderUrl: menuLoaderUrl, appName: appId, theme });
  }, [appId, menuLoaderUrl, theme]);
}
