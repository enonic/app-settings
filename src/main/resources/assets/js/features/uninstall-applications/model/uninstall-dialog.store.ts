import { atom } from 'nanostores';

import type { Application } from '../../../entities/application';

/**
 * The applications the confirmation is asking about, or nothing while it is closed.
 *
 * ? A store rather than page state: the toolbar's action list is a module constant, so `run` cannot
 * ? reach a component's `useState` — see § 3.2 of `docs/browse-framework.md`.
 */
export const $uninstallTargets = atom<readonly Application[] | undefined>(undefined);

export function openUninstallDialog(applications: readonly Application[]): void {
  if (applications.length === 0) {
    return;
  }

  $uninstallTargets.set(applications);
}

export function closeUninstallDialog(): void {
  $uninstallTargets.set(undefined);
}
