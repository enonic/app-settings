import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listIdProviders } from './id-provider.source';
import { IdProviderType } from './id-provider.types';

export const idProviderQueryFields: GraphQLFields = {
  idProviders: {
    type: list(nonNull(IdProviderType)),
    description: 'Every id provider on this instance, sorted by display name.',
    resolve: () => listIdProviders(),
  },
};
