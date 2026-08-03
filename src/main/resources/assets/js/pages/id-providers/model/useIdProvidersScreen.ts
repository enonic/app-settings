import { useEffect } from 'preact/hooks';

import { loadIdProviders } from '../../../entities/principal';

/** Starts the load on mount. This section reads one domain, so the slice's own loader is the whole of it. */
export function useIdProvidersScreen(): void {
  useEffect(() => {
    void loadIdProviders();
  }, []);
}
