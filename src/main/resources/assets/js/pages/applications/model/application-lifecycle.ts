import type { Application } from '../../../entities/application';
import { $config } from '../../../shared/config';

/** A stopped application can be started, whether the platform bundles it or not. */
export function isStartable(application: Application): boolean {
  return application.state === 'STOPPED';
}

/**
 * ! Stopping a platform-bundled application takes parts of XP itself down, and stopping the
 * ! application this tool runs from takes the tool down with it — neither is ever a target. The
 * ! toolbar and the details dropdown share this predicate so they cannot disagree.
 */
export function isStoppable(application: Application): boolean {
  return application.state === 'STARTED' && !application.system && !isOwnApplication(application);
}

function isOwnApplication({ key }: Application): boolean {
  return key === $config.get()?.appId;
}
