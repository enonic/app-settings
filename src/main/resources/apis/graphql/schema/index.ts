import type { GraphQLSchema } from '/lib/graphql';

import { generator } from './generator';
import { QueryType } from './query';

// ? Built once when the module is first required, not per request. app-users wraps this in a Java
// ? `synchronized` shim (GraphQLSchemaSynchronizer) against an XP 6.13-era race — not carried over.
// No `mutation` yet: GraphQL forbids an object type with no fields, so the Mutation root arrives
// with the first lifecycle mutation rather than shipping empty.
export const schema: GraphQLSchema = generator.createSchema({ query: QueryType });
