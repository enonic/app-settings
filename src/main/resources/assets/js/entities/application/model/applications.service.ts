import {
  $serverEventsConnected,
  APPLICATION_EVENT,
  onServerEvent,
  type ServerEvent,
} from '../../../shared/server-events';
import { invalidateApplicationInfo } from './application-info.store';
import { loadApplication, loadApplications } from './applications.load';
import { isApplicationsCached, removeApplication } from './applications.store';

export type ApplicationChange = {
  kind: 'installed' | 'uninstalled' | 'changed';
  key: string;
};

let unsubscribeEvents: (() => void) | undefined;
let unsubscribeConnection: (() => void) | undefined;

/**
 * Reads an application lifecycle change out of a server event, however it was caused — this tool,
 * another admin, a jar dropped in the deploy folder. STARTING/STOPPING and the resolver states are
 * transient and each is followed by a terminal event, so only the terminal ones count.
 */
export function toApplicationChange(event: ServerEvent): ApplicationChange | undefined {
  if (event.type !== APPLICATION_EVENT) {
    return undefined;
  }
  const key = event.data?.applicationKey;
  if (key == null) {
    return undefined;
  }

  switch (event.data?.eventType) {
    case 'INSTALLED':
      return { kind: 'installed', key };
    case 'UNINSTALLED':
      return { kind: 'uninstalled', key };
    case 'STARTED':
    case 'STOPPED':
    case 'UPDATED':
      return { kind: 'changed', key };
    default:
      return undefined;
  }
}

export function start(): void {
  if (unsubscribeEvents != null) {
    return;
  }

  unsubscribeEvents = onServerEvent(handleServerEvent);

  // Events missed while the socket was down leave the cached list stale, so a reconnect reloads
  // it whole. The first connect is not a reconnect: nothing was missed yet.
  let disconnected = false;
  unsubscribeConnection = $serverEventsConnected.listen((connected) => {
    if (!connected) {
      disconnected = true;
      return;
    }
    if (disconnected) {
      disconnected = false;
      if (isApplicationsCached()) {
        void loadApplications();
      }
    }
  });
}

export function stop(): void {
  unsubscribeEvents?.();
  unsubscribeEvents = undefined;
  unsubscribeConnection?.();
  unsubscribeConnection = undefined;
}

// *
// * Internal
// *
function handleServerEvent(event: ServerEvent): void {
  const change = toApplicationChange(event);
  if (change == null) {
    return;
  }

  invalidateApplicationInfo(change.key);

  switch (change.kind) {
    case 'installed':
      if (isApplicationsCached()) {
        void loadApplications();
      }
      return;
    case 'uninstalled':
      removeApplication(change.key);
      return;
    case 'changed':
      void loadApplication(change.key);
      return;
  }
}
