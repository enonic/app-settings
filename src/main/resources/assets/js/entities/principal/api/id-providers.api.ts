import type { ResultAsync } from 'neverthrow';

import { requestGraphQl, type AppError, type GraphQlRoot } from '../../../shared/api';
import type { IdProvider, IdProviderName } from '../model/principal.types';

/**
 * ! Two roots over one field, because a selection carries a cost and not only a shape. `application`
 * ! resolves through a descriptor read per provider, and each of `users` and `groups` through a
 * ! `findPrincipals` search per provider — three server operations each, for a list Users, Groups and
 * ! Roles read only to name where a principal comes from. Users re-runs its whole screen query on every
 * ! debounced keystroke, so the full selection there is that cost per keystroke.
 */
const ID_PROVIDER_NAMES_SELECTION = `{
  key
  displayName
}`;

/** For any screen naming a principal's origin: Users, Groups, Roles. */
export const ID_PROVIDER_NAMES_ROOT: GraphQlRoot = {
  field: 'idProviders',
  selection: ID_PROVIDER_NAMES_SELECTION,
};

export type IdProviderNamesData = { idProviders: IdProviderNameDto[] | null };

// One `count: 0` search per provider, which is what lets the Users filter hide a provider holding none
// and show the rest with a number, as the client-side filters of the other sections do.
const ID_PROVIDER_USER_COUNTS_SELECTION = `{
  key
  displayName
  users {
    total
  }
}`;

export const ID_PROVIDER_USER_COUNTS_ROOT: GraphQlRoot = {
  field: 'idProviders',
  selection: ID_PROVIDER_USER_COUNTS_SELECTION,
};

type IdProviderUserCountDto = IdProviderNameDto & { users: { total: number } };

export type IdProviderUserCountsData = { idProviders: IdProviderUserCountDto[] | null };

export type IdProviderUserCount = IdProviderName & { users: number };

export function toIdProviderUserCounts(
  dtos: readonly IdProviderUserCountDto[],
): IdProviderUserCount[] {
  return dtos.map(({ key, displayName, users }) => ({ key, displayName, users: users.total }));
}

// Counts only: `items` on either set is every principal the provider holds, which on a
// directory-backed install is the whole directory. The panel asks for numbers, not rows.
const ID_PROVIDERS_SELECTION = `{
  key
  displayName
  description
  application {
    key
    displayName
  }
  users {
    total
  }
  groups {
    total
  }
}`;

/** Everything the ID Providers section shows, and only that section. */
export const ID_PROVIDERS_ROOT: GraphQlRoot = {
  field: 'idProviders',
  selection: ID_PROVIDERS_SELECTION,
};

type IdProviderNameDto = IdProviderName;

type IdProviderDto = {
  key: string;
  displayName: string;
  description: string | null;
  application: { key: string; displayName: string } | null;
  users: { total: number };
  groups: { total: number };
};

export type IdProvidersData = { idProviders: IdProviderDto[] | null };

export function toIdProviders(dtos: readonly IdProviderDto[]): IdProvider[] {
  return dtos.map(toIdProvider);
}

export function toIdProviderNames(dtos: readonly IdProviderNameDto[]): IdProviderName[] {
  return dtos.map(({ key, displayName }) => ({ key, displayName }));
}

/** For the ID Providers section, which needs nothing else. */
export function fetchIdProviders(signal?: AbortSignal): ResultAsync<IdProvider[], AppError> {
  return requestGraphQl<{ idProviders: IdProviderDto[] }>(ID_PROVIDERS_ROOT, { signal }).map(
    ({ idProviders }) => toIdProviders(idProviders),
  );
}

//
// * Helpers
//

function toIdProvider(dto: IdProviderDto): IdProvider {
  return {
    key: dto.key,
    displayName: dto.displayName,
    description: dto.description ?? undefined,
    application: dto.application ?? undefined,
    users: { total: dto.users.total },
    groups: { total: dto.groups.total },
  };
}
