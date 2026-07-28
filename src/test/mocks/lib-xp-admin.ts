import type { ExtensionUrlParams } from '@enonic-types/lib-admin';
import { vi } from 'vitest';

export const extensionUrl = vi.fn<(params: ExtensionUrlParams) => string>();
