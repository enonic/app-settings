import type { Project } from '@enonic-types/lib-project';
import { vi } from 'vitest';

export const list = vi.fn<() => Project[]>();
