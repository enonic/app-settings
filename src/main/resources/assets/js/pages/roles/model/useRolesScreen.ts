import { useEffect } from 'preact/hooks';

import { loadRolesScreen } from './roles.screen';

/** Starts the screen's one load on mount. The three stores it fills are read through their own hooks. */
export function useRolesScreen(): void {
  useEffect(() => {
    void loadRolesScreen();
  }, []);
}
