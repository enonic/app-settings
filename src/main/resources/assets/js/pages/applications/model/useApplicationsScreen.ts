import { useEffect } from 'preact/hooks';

import { ensureApplications } from '../../../entities/application';
import { ensureMarketApplications } from '../../../entities/market';

export function useApplicationsScreen(): void {
  useEffect(() => {
    void ensureApplications();
    // TODO: Restore the managed-mode guard on the way back to app-applications, against that app's
    // TODO: own `config.managedMode`. It read:
    // TODO:   if (!isAppsManagedMode()) {
    // TODO:     void ensureMarketApplications();
    // TODO:   }
    void ensureMarketApplications();
  }, []);
}
