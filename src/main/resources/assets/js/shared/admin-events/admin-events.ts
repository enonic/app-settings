import {
  createAdminEvents,
  type AdminEvents,
  type TopicHandlers,
} from '@enonic/ui-utils/admin-events';

import { $config } from '../config';

let adminEvents: AdminEvents | undefined;

// ! Created on first use rather than at connect: the hub replays nothing, so a connection listener
// ! taken before `connect` has to reach the hub itself.
function hub(): AdminEvents {
  if (adminEvents === undefined) {
    const url = $config.get()?.apis.adminEvents;
    if (url === undefined) {
      throw new Error('The admin events hub was used before the config was set.');
    }
    adminEvents = createAdminEvents(url);
  }

  return adminEvents;
}

/** The shell's own subscriptions only; a section connects to the hub itself. */
export function connectAdminEvents(): void {
  hub().connect();
}

export function subscribeTopic(topic: string, handlers: TopicHandlers): () => void {
  return hub().subscribeTopic(topic, handlers);
}

export function subscribeConnection(listener: (connected: boolean) => void): () => void {
  return hub().subscribeConnection(listener);
}

export function subscribeSessionEnd(listener: () => void): () => void {
  return hub().subscribeSessionEnd(listener);
}
