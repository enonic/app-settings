import type { assetUrl as assetUrlFn } from '@enonic-types/lib-asset';
import { vi } from 'vitest';

export const assetUrl = vi.fn<typeof assetUrlFn>();
