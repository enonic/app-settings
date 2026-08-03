import { GraphQLString, list, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import { listGroupMembers, listGroupRoles, type GroupSource } from './group.source';
import { displayNameOf } from './principal.source';
import { PrincipalType, PrincipalTypeEnum } from './principal.types';

const principals = nonNull(list(nonNull(PrincipalType)));

export const GroupType: GraphQLType = generator.createObjectType({
  name: 'Group',
  description: 'A group, the principals in it, and the roles it holds.',
  fields: {
    key: {
      type: nonNull(GraphQLString),
    },
    type: {
      type: nonNull(PrincipalTypeEnum),
    },
    displayName: {
      type: nonNull(GraphQLString),
      resolve: (env: { source: GroupSource }) => displayNameOf(env.source),
    },
    description: {
      type: GraphQLString,
    },
    // ! One call each, so both stay lazy: a list that shows only names must not pay for the
    // ! membership of every group on the instance. Neither has a cheap count behind it — `getMembers`
    // ! and `getMemberships` answer with the rows or nothing — so unlike an id provider there is no
    // ! `total` to ask for on its own.
    members: {
      type: principals,
      description: 'Users and groups in this group, flat. Empty when nobody is in it.',
      resolve: (env: { source: GroupSource }) => listGroupMembers(env.source.key),
    },
    roles: {
      type: principals,
      description: 'Roles this group holds. Its parent groups are not among them.',
      resolve: (env: { source: GroupSource }) => listGroupRoles(env.source.key),
    },
  },
});
