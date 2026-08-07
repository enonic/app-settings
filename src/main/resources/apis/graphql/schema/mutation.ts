import { type GraphQLType } from '/lib/graphql';

import { principalMutationFields } from '../principal/principal.fields';
import { roleMutationFields } from '../principal/role.fields';
import { generator } from './generator';

/**
 * ! Every root field here is nullable, by the rule `QueryType` spells out — do not "tidy" these to
 * ! `nonNull(…)`.
 */
export const MutationType: GraphQLType = generator.createObjectType({
  name: 'Mutation',
  description:
    'Write access to what the Settings sections manage. A field is null only when the write could not be attempted; the accompanying error says why.',
  fields: {
    ...principalMutationFields,
    ...roleMutationFields,
  },
});
