import { vi } from 'vitest';

export const listener =
  vi.fn<
    (params: { type?: string; localOnly?: boolean; callback: (event: unknown) => void }) => null
  >();
