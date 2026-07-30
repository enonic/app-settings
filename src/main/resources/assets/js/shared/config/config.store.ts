import { atom } from 'nanostores';

import type { ToolConfig } from './config';

// Read once from the JSON island at boot, so the store starts empty rather than carrying a fake
// default. Everything that reads it runs after `setConfig` in main.ts.
export const $config = atom<ToolConfig | undefined>(undefined);

export function setConfig(config: ToolConfig): void {
  $config.set(config);
}
