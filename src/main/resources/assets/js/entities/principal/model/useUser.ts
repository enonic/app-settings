import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $userDetail, showUser, type UserDetailState } from './user-detail.store';

/**
 * The one details panel that loads: the Users list is paged, so the selected user need not be among the
 * loaded rows. The key is a plain string because it arrives from the route — it is a `UserKey` only once
 * a user answers to it.
 */
export function useUser(key: string | undefined): UserDetailState {
  const state = useStore($userDetail);

  useEffect(() => {
    showUser(key);
  }, [key]);

  return state;
}
