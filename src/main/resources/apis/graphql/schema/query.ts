import { type GraphQLType } from '/lib/graphql';

import { applicationQueryFields } from '../application/application.fields';
import { generator } from './generator';

export const QueryType: GraphQLType = generator.createObjectType({
  name: 'Query',
  description: 'Read access to everything the Settings sections manage.',
  fields: {
    ...applicationQueryFields,
  },
});
