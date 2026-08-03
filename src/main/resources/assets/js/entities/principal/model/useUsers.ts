import { useStore } from '@nanostores/preact';

import { $users, type UsersState } from './users.store';

/** A read. The Users screen owns the load, since the server does the narrowing and the paging. */
export function useUsers(): UsersState {
  return useStore($users);
}
