import type { ApiUrlParams, AssetUrlParams, Csp } from '@enonic-types/lib-portal';
import { vi } from 'vitest';

export const apiUrl = vi.fn<(params: ApiUrlParams) => string>();
export const assetUrl = vi.fn<(params: AssetUrlParams | string) => string>();
export const csp = vi.fn<() => Csp>();

// The real one is a frozen const object of source keywords; the values are what lands in the header.
export const CspSource = {
  SELF: "'self'",
  NONE: "'none'",
  UNSAFE_INLINE: "'unsafe-inline'",
  DATA: 'data:',
} as const;
