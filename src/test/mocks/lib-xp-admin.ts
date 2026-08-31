import type { ExtensionUrlParams } from '@enonic-types/lib-admin';
import { vi } from 'vitest';

export const extensionUrl = vi.fn<(params: ExtensionUrlParams) => string>();

export const getToolUrl = vi.fn<(application: string, tool: string) => string>();

export const getVersion = vi.fn<() => string>();

export const setTopic = vi.fn<(params: { name: string; allow: string | string[] }) => string>();

export const sendToTopic = vi.fn<(name: string, message?: unknown) => void>();
