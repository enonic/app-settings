import { GraphQLString, list, nonNull, type GraphQLFields } from '/lib/graphql';

import { getGroup, listGroups } from './group.source';
import { GroupDetailType, GroupType } from './group.types';

export const groupQueryFields: GraphQLFields = {
  groups: {
    type: list(nonNull(GroupType)),
    description: 'Every group on this instance, sorted by display name.',
    resolve: () => listGroups(),
  },
  group: {
    type: GroupDetailType,
    description: 'One group by key, or null when no group answers to it.',
    args: {
      key: nonNull(GraphQLString),
    },
    resolve: (env: { args: { key: string } }) => getGroup(env.args.key),
  },
};
