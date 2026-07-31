import type { IdProvider } from '../../../entities/principal';

/**
 * Display name, key and description, case-insensitive, over the providers already loaded. The key
 * is searched here, unlike in the principal sections: for a provider it is the name.
 */
export function filterIdProviders(providers: readonly IdProvider[], query: string): IdProvider[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...providers];
  }

  return providers.filter(({ displayName, key, description }) =>
    [displayName, key, description].some((field) => field?.toLowerCase().includes(needle) ?? false),
  );
}
