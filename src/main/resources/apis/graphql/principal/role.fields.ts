import { GraphQLString, list, nonNull, type GraphQLFields } from '/lib/graphql';

import { createRole, getRole, listRoles, updateRole, type RoleInput } from './role.source';
import { RoleDetailType, RoleType } from './role.types';

type RoleArgs = {
  displayName: string;
  description?: string;
  members?: string[];
};

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

export const roleMutationFields: GraphQLFields = {
  createRole: {
    type: RoleType,
    description: 'Creates a role and gives it the members listed.',
    args: {
      name: nonNull(GraphQLString),
      displayName: nonNull(GraphQLString),
      description: GraphQLString,
      members: nonNull(list(nonNull(GraphQLString))),
    },
    resolve: (env: { args: RoleArgs & { name: string } }) =>
      createRole(env.args.name, toRoleInput(env.args)),
  },
  updateRole: {
    type: RoleType,
    description:
      'Renames, re-describes and re-staffs a role. `members` is the whole list the role is to hold, not a delta.',
    args: {
      key: nonNull(GraphQLString),
      displayName: nonNull(GraphQLString),
      description: GraphQLString,
      members: nonNull(list(nonNull(GraphQLString))),
    },
    resolve: (env: { args: RoleArgs & { key: string } }) =>
      updateRole(env.args.key, toRoleInput(env.args)),
  },
};

// ! Non-null on the schema and defaulted anyway: `DataFetchingEnvironmentMapper` hands arguments to JS
// ! through the same `MapGenerator` that drops an empty `interfaces` list on `AdminExtensionItem`, so an
// ! empty selection can arrive as no argument at all.
function toRoleInput({ displayName, description, members }: RoleArgs): RoleInput {
  return { displayName, description, members: members ?? [] };
}
