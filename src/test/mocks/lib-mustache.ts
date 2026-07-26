import { vi } from 'vitest';

export const render = vi.fn<(view: unknown, params?: Record<string, unknown>) => string>();
