import { GraphQLString, list, nonNull, type GraphQLFields } from '/lib/graphql';

import {
  getIdProvider,
  listDefaultIdProviderPermissions,
  listIdProviders,
} from './id-provider.source';
import { IdProviderPermissionType, IdProviderType } from './id-provider.types';

export const idProviderQueryFields: GraphQLFields = {
  idProviders: {
    type: list(nonNull(IdProviderType)),
    description: 'Every id provider on this instance, sorted by display name.',
    resolve: () => listIdProviders(),
  },
  idProvider: {
    type: IdProviderType,
    description: 'One id provider by key, or null when no provider answers to it.',
    args: {
      key: nonNull(GraphQLString),
    },
    resolve: (env: { args: { key: string } }) => getIdProvider(env.args.key),
  },
  defaultIdProviderPermissions: {
    type: list(nonNull(IdProviderPermissionType)),
    description:
      'The permissions a new provider starts from. Fixed rather than read from anywhere: XP declares no default, so these are the three entries app-users seeds a new provider with.',
    resolve: () => listDefaultIdProviderPermissions(),
  },
};
