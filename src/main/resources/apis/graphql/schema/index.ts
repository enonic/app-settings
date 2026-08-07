import type { GraphQLSchema } from '/lib/graphql';

import { generator } from './generator';
import { MutationType } from './mutation';
import { QueryType } from './query';

// ? Built once when the module is first required, not per request. app-users wraps this in a Java
// ? `synchronized` shim (GraphQLSchemaSynchronizer) against an XP 6.13-era race — not carried over.
export const schema: GraphQLSchema = generator.createSchema({
  query: QueryType,
  mutation: MutationType,
});
