import { APPLICATION_EVENT, onServerEvent, type ServerEvent } from '../../../shared/server-events';
import { loadMarketApplications } from './market.load';
import { isMarketCached } from './market.store';

/**
 * The lifecycle events that leave the catalogue wrong: each moves an installed version, and
 * `installedVersion` and `updateAvailable` are resolved from those server-side.
 *
 * INSTALLED is one of them because an install has three other sources than the market tab of the
 * install dialog — an uploaded jar, another operator, a jar dropped into the deploy folder — and none
 * of those reloads the catalogue on its own.
 */
const STALE_EVENT_TYPES = new Set(['INSTALLED', 'UNINSTALLED', 'UPDATED']);

export function affectsMarket(event: ServerEvent): boolean {
  return event.type === APPLICATION_EVENT && STALE_EVENT_TYPES.has(event.data?.eventType ?? '');
}

let unsubscribeEvents: (() => void) | undefined;

export function start(): void {
  if (unsubscribeEvents != null) {
    return;
  }

  unsubscribeEvents = onServerEvent(handleServerEvent);
}

export function stop(): void {
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
}

// *
// * Internal
// *

function handleServerEvent(event: ServerEvent): void {
  // Nothing ever loaded the catalogue, so there is nothing to keep fresh — and this is the one read
  // that leaves the instance.
  if (!affectsMarket(event) || !isMarketCached()) {
    return;
  }

  void loadMarketApplications();
}
