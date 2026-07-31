import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $roles, loadRoles, type RolesState } from './roles.store';

export function useRoles(): RolesState {
  const state = useStore($roles);

  useEffect(() => {
    void loadRoles();
  }, []);

  return state;
}
