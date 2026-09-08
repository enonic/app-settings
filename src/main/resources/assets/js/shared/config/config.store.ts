import { atom } from 'nanostores';

import type { ToolConfig } from './config';

// Read once from the JSON island at boot, so the store starts empty rather than carrying a fake
// default. Everything that reads it runs after `setConfig` in main.ts.
export const $config = atom<ToolConfig | undefined>(undefined);

export function setConfig(config: ToolConfig): void {
  $config.set(config);
}

/**
 * Whether the visitor holds `role:system.admin`. Says nothing about which sections they may open —
 * the platform decides that per extension — only that no section's `allow` can shut them out.
 */
export function isSystemAdmin(): boolean {
  return $config.get()?.isAdmin === true;
}
