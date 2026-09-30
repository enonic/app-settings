import { vi } from 'vitest';

export const getPhrases =
  vi.fn<(locale: string | string[], bundles?: string[]) => Record<string, string>>();

export const getSupportedLocales = vi.fn<(bundles?: string[]) => string[]>();
