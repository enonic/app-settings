import {
  $serverEventsConnected,
  APPLICATION_EVENT,
  onServerEvent,
  type ServerEvent,
} from '../../../shared/server-events';
import { loadSectionExtensions } from './extensions.load';

/**
 * The lifecycle events that change which sections exist. `PROGRESS` fires once per percent while an
 * app downloads, and the transient states are each followed by one of these.
 */
const SECTION_EVENT_TYPES = new Set(['INSTALLED', 'UNINSTALLED', 'STARTED', 'STOPPED', 'UPDATED']);

/** An install ends in a burst of these, and only the rail's last word matters. */
const RELOAD_DELAY_MS = 300;

export function affectsSections(event: ServerEvent): boolean {
  return event.type === APPLICATION_EVENT && SECTION_EVENT_TYPES.has(event.data?.eventType ?? '');
}

let unsubscribeEvents: (() => void) | undefined;
let unsubscribeConnection: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Keeps the rail level with the server: an app installed, started, stopped or gone changes it. */
export function start(): void {
  if (unsubscribeEvents != null) {
    return;
  }

  unsubscribeEvents = onServerEvent(handleServerEvent);

  // Events missed while the socket was down leave the rail stale, so a reconnect rediscovers. The
  // first connect is not a reconnect: nothing was missed yet.
  let disconnected = false;
  unsubscribeConnection = $serverEventsConnected.listen((connected) => {
    if (!connected) {
      disconnected = true;
      return;
    }

    if (disconnected) {
      disconnected = false;
      reload();
    }
  });
}

export function stop(): void {
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
  unsubscribeConnection?.();
  unsubscribeConnection = undefined;

  if (timer != null) {
    clearTimeout(timer);
    timer = undefined;
  }
}

//
// * Internal
//

function handleServerEvent(event: ServerEvent): void {
  if (affectsSections(event)) {
    reload();
  }
}

function reload(): void {
  if (timer != null) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = undefined;
    void loadSectionExtensions();
  }, RELOAD_DELAY_MS);
}
