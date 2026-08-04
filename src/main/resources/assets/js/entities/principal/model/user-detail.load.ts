import { err, ok } from 'neverthrow';

import { fetchUserDetail, fetchUserMemberships } from '../api/users.api';
import type { UserDetail } from './principal.types';
import {
  $userDetail,
  beginUserDetailLoad,
  clearUserDetail,
  receiveUserDetail,
} from './user-detail.store';
import { $users } from './users.store';

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
    clearUserDetail();
    return;
  }

  const cached = cache.get(key);
  if (cached !== undefined) {
    receiveUserDetail(ok(cached));
    return;
  }

  beginUserDetailLoad();
  scheduled = setTimeout(() => void load(key), DEBOUNCE_MS);
}

/** Leaving the section: nothing loaded here means anything once the list is gone. */
export function forgetUsers(): void {
  cancel();
  cache.clear();
  clearUserDetail();
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
  const answer =
    row === undefined ? fetchUserDetail(key, signal) : fetchUserMemberships(row, signal);

  return answer.match(
    (user) => {
      if (signal.aborted) {
        return;
      }
      if (user !== undefined) {
        remember(key, user);
      }
      receiveUserDetail(ok(user));
    },
    (error) => {
      if (!signal.aborted) {
        receiveUserDetail(err(error));
      }
    },
  );
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
