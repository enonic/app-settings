import { map } from 'nanostores';

import { requestGraphQlDocument, type AppError } from '../../../shared/api';
import {
  USER_DOCUMENT,
  USER_MEMBERSHIPS_DOCUMENT,
  toUserDetail,
  withMemberships,
  type UserDetailData,
  type UserMembershipsData,
} from '../api/users.api';
import type { UserDetail } from './principal.types';
import { $users } from './users.store';

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

export const $userDetail = map<UserDetailState>({ status: 'idle' });

/**
 * The Users list is paged, so the selected user may not be among the loaded rows — the panel has to
 * fetch by key. That makes it the one details panel with a load of its own.
 *
 * ! Debounced, because the arrow keys move the active row and therefore the route: holding one down
 * ! would otherwise queue one request per row through a transport that runs them one at a time. The
 * ! previous request is cancelled as well, so an overtaken answer cannot land after a newer one.
 *
 * ! A key already answered is served from the cache without a request, which is what makes stepping back
 * ! and forth through a list free.
 */
const DEBOUNCE_MS = 250;
const CACHE_LIMIT = 50;

const cache = new Map<string, UserDetail>();
let pending: AbortController | undefined;
let scheduled: ReturnType<typeof setTimeout> | undefined;

export function showUser(key: string | undefined): void {
  cancel();

  if (key === undefined) {
    $userDetail.set({ status: 'idle' });
    return;
  }

  const cached = cache.get(key);
  if (cached !== undefined) {
    $userDetail.set({ status: 'ready', user: cached });
    return;
  }

  // The previous user stays on screen while the next is fetched, so stepping does not flash empty. The
  // error goes, though: it belonged to the load that failed, not to this one.
  $userDetail.set({ status: 'loading', user: $userDetail.get().user });
  scheduled = setTimeout(() => void load(key), DEBOUNCE_MS);
}

/** Leaving the section: nothing loaded here means anything once the list is gone. */
export function forgetUsers(): void {
  cancel();
  cache.clear();
  $userDetail.set({ status: 'idle' });
}

/**
 * The list is being reloaded, so what is cached describes rows that are about to be replaced.
 *
 * ! The panel keeps showing the user it has — the selection has not changed — but the next selection is
 * ! read fresh, and the open user is re-read as well. Without this, `Refresh` never refreshed the panel
 * ! and a cached hit could serve a user's old email beside their updated row.
 */
export function forgetUserDetails(): void {
  const shown = $userDetail.get().user?.key;
  cache.clear();

  if (shown !== undefined) {
    showUser(shown);
  }
}

//
// * Helpers
//

function cancel(): void {
  if (scheduled !== undefined) {
    clearTimeout(scheduled);
    scheduled = undefined;
  }
  pending?.abort();
}

/**
 * Asks for what the panel is actually missing.
 *
 * The row the list holds already carries every scalar the panel shows, so the common case reads only the
 * memberships and completes the row with them. A row the loaded page does not carry — a link opened
 * straight at a key, or a search that has narrowed past it — needs the user as well, and only then is the
 * whole thing read.
 */
function load(key: string): Promise<void> {
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  const row = $users.get().items.find((user) => user.key === key);

  return row === undefined
    ? requestGraphQlDocument<UserDetailData>(USER_DOCUMENT, { key }, signal).match(
        ({ user }) => settle(key, signal, user == null ? undefined : toUserDetail(user)),
        (error: AppError) => fail(signal, error),
      )
    : requestGraphQlDocument<UserMembershipsData>(USER_MEMBERSHIPS_DOCUMENT, { key }, signal).match(
        ({ user }) => settle(key, signal, user == null ? undefined : withMemberships(row, user)),
        (error: AppError) => fail(signal, error),
      );
}

function settle(key: string, signal: AbortSignal, detail: UserDetail | undefined): void {
  if (signal.aborted) {
    return;
  }

  if (detail === undefined) {
    // A key nothing answers to: the row is gone, which is an answer rather than a failure.
    $userDetail.set({ status: 'idle' });
    return;
  }

  remember(key, detail);
  $userDetail.set({ status: 'ready', user: detail });
}

function fail(signal: AbortSignal, error: AppError): void {
  if (!signal.aborted) {
    $userDetail.set({ status: 'error', error: error.message });
  }
}

// Oldest out first, so stepping through a long list cannot grow this without bound.
function remember(key: string, detail: UserDetail): void {
  if (cache.size >= CACHE_LIMIT) {
    const [oldest] = cache.keys();
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, detail);
}
