import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listGroups } from './group.source';
import { GroupType } from './group.types';

export const groupQueryFields: GraphQLFields = {
  groups: {
    type: list(nonNull(GroupType)),
    description: 'Every group on this instance, sorted by display name.',
    resolve: () => listGroups(),
  },
};
