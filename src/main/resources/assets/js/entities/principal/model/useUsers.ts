import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $users, type UsersState, loadUsers } from './users.store';

export function useUsers(): UsersState {
  const state = useStore($users);

  useEffect(() => {
    void loadUsers();
  }, []);

  return state;
}
