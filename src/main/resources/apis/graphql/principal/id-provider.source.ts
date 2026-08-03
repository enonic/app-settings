import { getDescriptor } from '/lib/xp/app';
import { findPrincipals, getIdProviders, type IdProvider } from '/lib/xp/auth';

import {
  byName,
  displayNameOf,
  nonEmpty,
  toPrincipalItem,
  type PrincipalItem,
} from './principal.source';

export type IdProviderSource = IdProvider;

export type BoundApplication = {
  key: string;
  displayName: string;
};

/** Carries what a count or a listing needs, so the container itself costs nothing to resolve. */
export type PrincipalSetSource = {
  idProvider: string;
  type: 'user' | 'group';
};

export function listIdProviders(): IdProvider[] {
  return getIdProviders().sort((a, b) => byName(displayNameOf(a), displayNameOf(b)));
}

/**
 * The application a provider is bound to, named as an administrator would recognise it.
 *
 * Null when the provider is bound to nothing, which means it serves no login. The display name comes
 * from the application's own descriptor and falls back to the key — an application that ships no
 * title is still better shown by its key than by nothing.
 */
export function boundApplicationOf(provider: IdProvider): BoundApplication | null {
  const key = provider.idProviderConfig?.applicationKey;
  if (key == null) {
    return null;
  }

  return { key, displayName: nonEmpty(getDescriptor({ key })?.title ?? undefined) ?? key };
}

export function principalSetOf(
  idProvider: string,
  type: PrincipalSetSource['type'],
): PrincipalSetSource {
  return { idProvider, type };
}

/**
 * How many principals of this kind the provider holds.
 *
 * `count: 0` asks the search for the total and no hits at all — the cheap half of the pair. A
 * provider can hold a whole corporate directory, so the count must never be the length of a list
 * somebody fetched.
 */
export function countPrincipals({ idProvider, type }: PrincipalSetSource): number {
  return findPrincipals({ type, idProvider, count: 0 }).total;
}

/**
 * ! Unbounded: this is every user of the provider, which on a directory-backed install is the whole
 * ! directory. Kept off the list query on purpose — see the ID Providers notes in `docs/unified-api.md`.
 */
export function listPrincipals({ idProvider, type }: PrincipalSetSource): PrincipalItem[] {
  return findPrincipals({ type, idProvider, count: -1 })
    .hits.map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}
