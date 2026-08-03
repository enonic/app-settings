import { GraphQLString, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import { boundApplicationOf, principalSetOf, type IdProviderSource } from './id-provider.source';
import { displayNameOf } from './principal.source';
import { PrincipalSetType } from './principal.types';

const BoundApplicationType: GraphQLType = generator.createObjectType({
  name: 'BoundApplication',
  description: 'The application a provider is bound to. Absent means it serves no login yet.',
  fields: {
    key: {
      type: nonNull(GraphQLString),
    },
    displayName: {
      type: nonNull(GraphQLString),
      description: "The application's own title, falling back to its key.",
    },
    // TODO: [#8] The per-instance `config` tree of the binding is left out until the PropertyTree
    // wire format is settled — see the open question in `docs/unified-api.md`. Nothing renders it.
  },
});

export const IdProviderType: GraphQLType = generator.createObjectType({
  name: 'IdProvider',
  description: 'An id provider instance, as configured under ID Providers.',
  fields: {
    key: {
      type: nonNull(GraphQLString),
    },
    displayName: {
      type: nonNull(GraphQLString),
      resolve: (env: { source: IdProviderSource }) => displayNameOf(env.source),
    },
    description: {
      type: GraphQLString,
    },
    application: {
      type: BoundApplicationType,
      resolve: (env: { source: IdProviderSource }) => boundApplicationOf(env.source),
    },
    // Both containers resolve for free — nothing is counted or fetched until a leaf below is asked.
    users: {
      type: nonNull(PrincipalSetType),
      resolve: (env: { source: IdProviderSource }) => principalSetOf(env.source.key, 'user'),
    },
    groups: {
      type: nonNull(PrincipalSetType),
      resolve: (env: { source: IdProviderSource }) => principalSetOf(env.source.key, 'group'),
    },
    // ! No `roles` field yet, deliberately. The roles a provider's principals hold is an aggregate
    // ! with no cheap query behind it: `findPrincipals` cannot filter roles by provider, and walking
    // ! memberships means one call per principal. The affordable shape — one pass over all roles,
    // ! bucketing by the provider segment of each member key — is only worth writing once resolvers
    // ! can memoize per request, which is the batching item in #23.
  },
});
