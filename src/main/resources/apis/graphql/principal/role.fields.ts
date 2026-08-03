import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listRoles } from './role.source';
import { RoleType } from './role.types';

export const roleQueryFields: GraphQLFields = {
  roles: {
    type: list(nonNull(RoleType)),
    description: 'Every role on this instance, sorted by display name.',
    resolve: () => listRoles(),
  },
};
