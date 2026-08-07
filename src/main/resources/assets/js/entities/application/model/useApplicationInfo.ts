import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import {
  $applicationsInfo,
  type ApplicationInfoEntry,
  ensureApplicationInfo,
} from './application-info.store';
import type { ApplicationState } from './application.types';

/**
 * What the application under `key` provides, loaded on first sight and served from the cache after.
 *
 * The key arrives from the route, so the panel owns it: the store keeps an entry per key and knows
 * nothing about which one is on screen. Asking again for an entry that is missing is what reloads a
 * panel whose application was invalidated by a lifecycle event under it.
 */
export function useApplicationInfo(
  key: string | undefined,
  state?: ApplicationState,
): ApplicationInfoEntry | undefined {
  const entries = useStore($applicationsInfo);
  const stopped = state === 'STOPPED';
  const entry = key == null || stopped ? undefined : entries[key];
  const missing = key != null && entry === undefined;

  useEffect(() => {
    if (key != null && !stopped) {
      ensureApplicationInfo(key);
    }
  }, [key, stopped, missing]);

  return entry;
}
