import type { ReactNode } from 'react';

import type { Application, ApplicationState } from '../../../entities/application';
import type { BrowseRow } from '../../../widgets/browse-list/browse-list';

const STATE_LABEL_KEYS: Record<ApplicationState, string> = {
  STARTED: 'applications.state.started',
  STOPPED: 'applications.state.stopped',
};

export function applicationStateLabelKey(state: ApplicationState): string {
  return STATE_LABEL_KEYS[state];
}

export function toApplicationRow(
  application: Application,
  icon?: ReactNode,
  stateLabel?: string,
): BrowseRow {
  // The available version the mockups show next to the installed one comes from market.enonic.com,
  // which no XP lib exposes — § 5.8 of docs/browse-framework.md.
  const meta = [application.version, stateLabel].filter((cell) => cell != null);

  return {
    key: application.key,
    title: application.displayName,
    subtitle: application.description,
    icon,
    meta: meta.length === 0 ? undefined : meta,
  };
}
