import { GraphQLString, list, nonNull, type GraphQLFields } from '/lib/graphql';

import { getRole, listRoles } from './role.source';
import { RoleDetailType, RoleType } from './role.types';

export const roleQueryFields: GraphQLFields = {
  roles: {
    type: list(nonNull(RoleType)),
    description: 'Every role on this instance, sorted by display name.',
    resolve: () => listRoles(),
  },
  role: {
    type: RoleDetailType,
    description: 'One role by key, or null when no role answers to it.',
    args: {
      key: nonNull(GraphQLString),
    },
    resolve: (env: { args: { key: string } }) => getRole(env.args.key),
  },
};
