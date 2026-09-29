import { I18nProvider } from '@enonic/ui';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import {
  loadSectionExtensions,
  startSectionExtensionsService,
  stopSectionExtensionsService,
} from '../../entities/extension';
import { connectAdminEvents } from '../../shared/admin-events';
import { useTheme } from '../../shared/app-state';
import type { ToolConfig } from '../../shared/config';
import { translate } from '../../shared/i18n';
import { useMenuPanel } from '../../shared/menu';
import { router } from '../model/router';

export type AppProps = {
  config: ToolConfig;
};

export function App({ config }: AppProps) {
  useTheme();
  useMenuPanel(config);

  const adminEventsUrl = config.apis.adminEvents;
  useEffect(() => {
    connectAdminEvents(adminEventsUrl);
  }, [adminEventsUrl]);

  useEffect(() => {
    void loadSectionExtensions();
    startSectionExtensionsService();

    return () => {
      stopSectionExtensionsService();
    };
  }, []);

  return (
    <I18nProvider translate={translate}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
