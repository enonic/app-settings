import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import { useTheme } from '../shared/app-state';
import type { ToolConfig } from '../shared/config';
import { connectToServerEvents } from '../shared/server-events';
import { router } from './router';

export type AppProps = {
  config: ToolConfig;
};

export function App({ config }: AppProps) {
  useTheme();

  const eventsUrl = config.apis.events;
  useEffect(() => connectToServerEvents(eventsUrl), [eventsUrl]);

  return <RouterProvider router={router} />;
}
