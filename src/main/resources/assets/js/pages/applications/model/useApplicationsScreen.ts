import { useEffect } from 'preact/hooks';

import { ensureApplications } from '../../../entities/application';
import { ensureMarketApplications } from '../../../entities/market';
import { isAppsManagedMode } from '../../../shared/config';

export function useApplicationsScreen(): void {
  useEffect(() => {
    void ensureApplications();

    if (!isAppsManagedMode()) {
      void ensureMarketApplications();
    }
  }, []);
}
