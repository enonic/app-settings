import { GraphQLInt, GraphQLString, nonNull, type GraphQLFields } from '/lib/graphql';

import { getUser, listUsers, type UserSort } from './user.source';
import { UserPageType, UserSortEnum, UserType } from './user.types';

export const userQueryFields: GraphQLFields = {
  users: {
    type: UserPageType,
    description:
      'One page of users, searched, filtered and ordered by the server — the only section that cannot load whole.',
    args: {
      start: GraphQLInt,
      count: GraphQLInt,
      search: GraphQLString,
      idProvider: GraphQLString,
      sort: UserSortEnum,
    },
    resolve: (env: {
      args: {
        start?: number;
        count?: number;
        search?: string;
        idProvider?: string;
        sort?: UserSort;
      };
    }) => listUsers(env.args),
  },
  user: {
    type: UserType,
    description: 'One user by key, or null when no user answers to it.',
    args: {
      key: nonNull(GraphQLString),
    },
    resolve: (env: { args: { key: string } }) => getUser(env.args.key),
  },
};
