import { err, ok } from 'neverthrow';

import { fetchMarketApplications } from '../api/market.api';
import { beginMarketLoad, isMarketCached, receiveMarketApplications } from './market.store';

/**
 * Loads what Enonic Market offers. One domain, so the load belongs to the slice — see
 * `.claude/rules/stores.md`.
 */
let pending: AbortController | undefined;

// A second caller arriving mid-load joins the request in flight rather than starting another. Worth
// more here than elsewhere: this one leaves the instance.
let inFlight: Promise<void> | undefined;

export function loadMarketApplications(): Promise<void> {
  pending?.abort();
  const controller = new AbortController();
  pending = controller;
  const { signal } = controller;

  beginMarketLoad();

  inFlight = fetchMarketApplications(signal)
    .match(
      (items) => {
        if (!signal.aborted) {
          receiveMarketApplications(ok(items));
        }
      },
      (error) => {
        if (!signal.aborted) {
          receiveMarketApplications(err(error));
        }
      },
    )
    .finally(() => {
      if (pending === controller) {
        inFlight = undefined;
      }
    });

  return inFlight;
}

/**
 * The first caller's load, and nothing on a later one.
 *
 * ! This is the only sanctioned entry point for anything rendering rows. The market is an outbound
 * ! HTTP call from XP with no cache on either side, so a screen that reloaded it per visit would pay a
 * ! round trip to another host for a catalogue that changes weekly. `loadMarketApplications` is for a
 * ! Refresh the user asked for.
 */
export function ensureMarketApplications(): Promise<void> {
  if (isMarketCached()) {
    return Promise.resolve();
  }

  return inFlight ?? loadMarketApplications();
}
