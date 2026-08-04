import { map } from 'nanostores';
import type { Result } from 'neverthrow';

import type { AppError } from '../../../shared/api';
import type { UserDetail } from './principal.types';

export type UserDetailState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /**
   * The user the panel is showing, or the last one it showed while the next is on its way.
   *
   * ! Absent once a load has failed, deliberately: keeping the previous user would leave the panel
   * ! describing someone other than the selected row, with nothing on screen to say it is stale.
   */
  user?: UserDetail;
  error?: string;
};

/**
 * What the details panel shows. The request, its debounce and its cache belong to
 * `user-detail.load.ts`: a store file holds no transport, here as anywhere else.
 */
export const $userDetail = map<UserDetailState>({ status: 'idle' });

/**
 * ! Keeps the user on screen while the next one is fetched, so stepping through rows does not flash
 * ! empty. The message goes, though: it belonged to the load that failed, not to this one.
 */
export function beginUserDetailLoad(): void {
  $userDetail.set({ status: 'loading', user: $userDetail.get().user });
}

/** `undefined` is an answer rather than a failure: the key names nobody, so there is nothing to show. */
export function receiveUserDetail(result: Result<UserDetail | undefined, AppError>): void {
  result.match(
    (user) => $userDetail.set(user === undefined ? { status: 'idle' } : { status: 'ready', user }),
    (error) => $userDetail.set({ status: 'error', error: error.message }),
  );
}

/** Nothing selected, so nothing to say about it. */
export function clearUserDetail(): void {
  $userDetail.set({ status: 'idle' });
}
