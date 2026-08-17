import { useEffect } from 'preact/hooks';

import { ensureApplications } from '../../../entities/application';
import { ensureMarketApplications } from '../../../entities/market';
import { isReadonlyMode } from '../../../shared/config';

export function useApplicationsScreen(): void {
  useEffect(() => {
    void ensureApplications();

    if (!isReadonlyMode()) {
      void ensureMarketApplications();
    }
  }, []);
}
