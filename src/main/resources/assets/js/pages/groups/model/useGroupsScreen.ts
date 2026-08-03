import { useEffect } from 'preact/hooks';

import { loadGroupsScreen } from './groups.screen';

/** Starts the screen's one load on mount. The two stores it fills are read through their own hooks. */
export function useGroupsScreen(): void {
  useEffect(() => {
    void loadGroupsScreen();
  }, []);
}
