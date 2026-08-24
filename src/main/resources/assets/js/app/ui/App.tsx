import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import { loadSectionExtensions } from '../../entities/extension';
import { useTheme } from '../../shared/app-state';
import type { ToolConfig } from '../../shared/config';
import { useMenuPanel } from '../../shared/menu';
import { connectToServerEvents } from '../../shared/server-events';
import { router } from '../model/router';

// TODO: [extensions] Both services belong to sections that move to app-applications and app-users;
// commented out rather than deleted until that path is proven.
// import { startApplicationsService, stopApplicationsService } from '../entities/application';
// import { startMarketService, stopMarketService } from '../entities/market';

export type AppProps = {
  config: ToolConfig;
};

export function App({ config }: AppProps) {
  useTheme();
  useMenuPanel(config);

  const eventsUrl = config.apis.events;
  useEffect(() => connectToServerEvents(eventsUrl), [eventsUrl]);

  useEffect(() => {
    void loadSectionExtensions();
  }, []);

  // useEffect(() => {
  //   startApplicationsService();
  //   startMarketService();
  //
  //   return () => {
  //     stopApplicationsService();
  //     stopMarketService();
  //   };
  // }, []);

  return <RouterProvider router={router} />;
}
