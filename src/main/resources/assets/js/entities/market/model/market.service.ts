import { APPLICATION_EVENT, onServerEvent, type ServerEvent } from '../../../shared/server-events';
import { loadMarketApplications } from './market.load';
import { isMarketCached } from './market.store';

/**
 * The lifecycle events that leave the catalogue wrong: both move an installed version, and
 * `installedVersion` and `updateAvailable` are resolved from those server-side.
 *
 * ! INSTALLED is deliberately not one of them. `runMarketInstall` reloads the catalogue itself as
 * ! soon as core answers, and holds the row's installing state until that lands — reloading here too
 * ! would be a second outbound call for one install.
 */
const STALE_EVENT_TYPES = new Set(['UNINSTALLED', 'UPDATED']);

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
