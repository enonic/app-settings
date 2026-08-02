import type { IdProvider } from '@enonic-types/lib-auth';
import { vi } from 'vitest';

export const hasRole = vi.fn<(role: string) => boolean>();

export const getIdProviders = vi.fn<() => IdProvider[]>();
