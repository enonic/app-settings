import {
  createAdminEvents,
  type AdminEvents,
  type TopicHandlers,
} from '@enonic/ui-utils/admin-events';

let adminEvents: AdminEvents | undefined;

/** The shell's own subscriptions only; a section connects to the hub itself. */
export function connectAdminEvents(url: string): void {
  adminEvents ??= createAdminEvents(url);
  adminEvents.connect();
}

export function subscribeTopic(topic: string, handlers: TopicHandlers): () => void {
  return adminEvents?.subscribeTopic(topic, handlers) ?? (() => {});
}
