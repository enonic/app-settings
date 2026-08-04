import { useEffect } from 'preact/hooks';

import { ensureApplications } from '../../../entities/application';

/**
 * Starts the load on mount. This section reads one domain, so the slice's own loader is the whole of
 * it; `ensureApplications` serves a list it already holds, so coming back to the section is free.
 */
export function useApplicationsScreen(): void {
  useEffect(() => {
    void ensureApplications();
  }, []);
}
