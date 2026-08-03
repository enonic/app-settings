import { GraphQLString, list, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import { displayNameOf } from './principal.source';
import { PrincipalType, PrincipalTypeEnum } from './principal.types';
import { listRoleMembers, type RoleSource } from './role.source';

export const RoleType: GraphQLType = generator.createObjectType({
  name: 'Role',
  description: 'A role, and the principals that hold it.',
  fields: {
    key: {
      type: nonNull(GraphQLString),
    },
    type: {
      type: nonNull(PrincipalTypeEnum),
    },
    displayName: {
      type: nonNull(GraphQLString),
      resolve: (env: { source: RoleSource }) => displayNameOf(env.source),
    },
    description: {
      type: GraphQLString,
    },
    // ! Always null today, and kept anyway: `PrincipalNodeTranslator` never copies the timestamp off
    // ! the node, which is a defect on the XP side rather than a shape to design around — see the
    // ! `modifiedTime` entry in `docs/platform-facts.md`. Nullable here, and the details panel drops
    // ! the row, so the field starts working the day the platform does.
    modifiedTime: {
      type: GraphQLString,
    },
    // ! One getMembers call per role, so it stays lazy: a list that shows only names must not pay
    // ! for the membership of every role on the instance.
    members: {
      type: nonNull(list(nonNull(PrincipalType))),
      description: 'Users and groups holding this role. Empty when nobody holds it.',
      resolve: (env: { source: RoleSource }) => listRoleMembers(env.source.key),
    },
  },
});
