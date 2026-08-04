import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import { startApplicationsService, stopApplicationsService } from '../entities/application';
import { useTheme } from '../shared/app-state';
import type { ToolConfig } from '../shared/config';
import { useMenuPanel } from '../shared/menu';
import { connectToServerEvents } from '../shared/server-events';
import { router } from './router';

export type AppProps = {
  config: ToolConfig;
};

export function App({ config }: AppProps) {
  useTheme();
  useMenuPanel(config);

  const eventsUrl = config.apis.events;
  useEffect(() => connectToServerEvents(eventsUrl), [eventsUrl]);

  useEffect(() => {
    startApplicationsService();
    return stopApplicationsService;
  }, []);

  return <RouterProvider router={router} />;
}
