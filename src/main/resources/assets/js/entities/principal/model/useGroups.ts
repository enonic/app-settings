import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $groups, type GroupsState, loadGroups } from './groups.store';

export function useGroups(): GroupsState {
  const state = useStore($groups);

  useEffect(() => {
    void loadGroups();
  }, []);

  return state;
}
