import { subscribeTopic } from '../../../shared/admin-events';
import { $config } from '../../../shared/config';
import { loadSectionExtensions } from './extensions.load';

/** An install ends in a burst of publishes, and only the rail's last word matters. */
const RELOAD_DELAY_MS = 300;

let unsubscribe: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Keeps the rail level with the server through the hub's `applications` topic: any lifecycle event
 * may change which sections exist, and a detected loss means the same — something was missed, so
 * rediscover. ! That topic's `allow` is admin-only for now, so a delegated operator's rail is
 * static until reload — accepted until a broader topic is warranted.
 */
export function start(): void {
  if (unsubscribe != null) {
    return;
  }

  const topic = $config.get()?.topics.applications;
  if (topic == null) {
    return;
  }

  unsubscribe = subscribeTopic(topic, {
    onMessage: reload,
    onLoss: reload,
  });
}

export function stop(): void {
  unsubscribe?.();
  unsubscribe = undefined;

  if (timer != null) {
    clearTimeout(timer);
    timer = undefined;
  }
}

//
// * Internal
//

function reload(): void {
  if (timer != null) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = undefined;
    void loadSectionExtensions();
  }, RELOAD_DELAY_MS);
}
