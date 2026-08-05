import type { ReactNode } from 'react';

import type { Application, ApplicationState } from '../../../entities/application';
import type { MarketApplication } from '../../../entities/market';
import type { BrowseRow } from '../../../widgets/browse-list/browse-list';

const STATE_LABEL_KEYS: Record<ApplicationState, string> = {
  STARTED: 'applications.state.started',
  STOPPED: 'applications.state.stopped',
};

export function applicationStateLabelKey(state: ApplicationState): string {
  return STATE_LABEL_KEYS[state];
}

/** The newer version the market offers, per application key. */
export function availableVersions(market: readonly MarketApplication[]): Map<string, string> {
  const available = new Map<string, string>();

  for (const application of market) {
    if (application.updateAvailable) {
      available.set(application.key, application.latest.version);
    }
  }

  return available;
}

export function toApplicationRow(
  application: Application,
  icon?: ReactNode,
  stateLabel?: string,
  version?: ReactNode,
): BrowseRow {
  const meta = [version, stateLabel].filter((cell) => cell != null);

  return {
    key: application.key,
    title: application.displayName,
    subtitle: application.description,
    icon,
    meta: meta.length === 0 ? undefined : meta,
  };
}
