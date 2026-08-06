import { vi } from 'vitest';

// ? Shape restated rather than imported from src/main/resources/lib/idprovider.ts — that module reads
// ? the `__` bridge, which only the server tsconfig declares.
type IdProviderDescriptor = {
  mode?: string;
  hasConfig: boolean;
};

type IdProviderPermission = {
  principal: { key: string; type: string; displayName: string };
  access?: string;
};

export const getIdProviderDescriptor =
  vi.fn<(params: { application: string }) => IdProviderDescriptor | null>();

export const getIdProviderPermissions =
  vi.fn<(params: { idProvider: string }) => IdProviderPermission[] | null>();

export const defaultIdProviderPermissions = vi.fn<() => IdProviderPermission[]>();
