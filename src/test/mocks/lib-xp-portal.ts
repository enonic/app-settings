import type { ApiUrlParams, AssetUrlParams } from '@enonic-types/lib-portal';
import { vi } from 'vitest';

export const apiUrl = vi.fn<(params: ApiUrlParams) => string>();
export const assetUrl = vi.fn<(params: AssetUrlParams | string) => string>();
