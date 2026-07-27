import type { AssetUrlParams } from '@enonic-types/lib-portal';
import { vi } from 'vitest';

export const assetUrl = vi.fn<(params: AssetUrlParams | string) => string>();
