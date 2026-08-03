import type { ResultAsync } from 'neverthrow';

import { requestGraphQl, type AppError, type GraphQlRoot } from '../../../shared/api';
import type { IdProvider } from '../model/principal.types';

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

/**
 * The root field and selection for the provider list, exported so a screen that needs providers
 * alongside other domains can put them in one document — Groups and Roles both name a principal's
 * provider, and read the display names off this list.
 */
export const ID_PROVIDERS_ROOT: GraphQlRoot = {
  field: 'idProviders',
  selection: ID_PROVIDERS_SELECTION,
};

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
