import { GraphQLString, type GraphQLType } from '/lib/graphql';
import { getVersion } from '/lib/xp/admin';

import { generator } from './generator';

export const QueryType: GraphQLType = generator.createObjectType({
  name: 'Query',
  description: 'Read access to everything the Settings sections manage.',
  fields: {
    systemVersion: {
      type: GraphQLString,
      description: 'Version of this XP installation.',
      resolve: () => getVersion(),
    },
  },
});
