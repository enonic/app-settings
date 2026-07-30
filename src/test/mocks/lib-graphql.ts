import { vi } from 'vitest';

import type {
  CreateEnumTypeParams,
  CreateObjectTypeParams,
  CreateSchemaParams,
  ExecutionResult,
  GraphQLSchema,
  GraphQLType,
  SchemaGenerator,
} from '../../main/resources/types/graphql';

// Real GraphQL types are opaque Java objects, so the doubles stand in as tagged plain objects:
// a test can assert on the shape a builder was handed without a running graphql-java.
function stub<T>(tag: string, value: object): T {
  return { __stub: tag, ...value } as unknown as T;
}

export const GraphQLBoolean = stub<GraphQLType>('Boolean', {});
export const GraphQLFloat = stub<GraphQLType>('Float', {});
export const GraphQLID = stub<GraphQLType>('ID', {});
export const GraphQLInt = stub<GraphQLType>('Int', {});
export const GraphQLString = stub<GraphQLType>('String', {});

export const DateTime = stub<GraphQLType>('DateTime', {});
export const Json = stub<GraphQLType>('Json', {});

export const createObjectType = vi.fn((params: CreateObjectTypeParams) =>
  stub<GraphQLType>('ObjectType', { name: params.name, fields: params.fields }),
);

export const createEnumType = vi.fn((params: CreateEnumTypeParams) =>
  stub<GraphQLType>('EnumType', { name: params.name, values: params.values }),
);

export const createSchema = vi.fn((params: CreateSchemaParams) =>
  stub<GraphQLSchema>('Schema', { query: params.query, mutation: params.mutation }),
);

export const newSchemaGenerator = vi.fn(
  (): SchemaGenerator => ({ createObjectType, createEnumType, createSchema }),
);

export const list = vi.fn((type: GraphQLType) => stub<GraphQLType>('List', { of: type }));

export const nonNull = vi.fn((type: GraphQLType) => stub<GraphQLType>('NonNull', { of: type }));

export const reference = vi.fn((typeKey: string) => stub<GraphQLType>('Reference', { typeKey }));

export const execute = vi.fn<() => ExecutionResult>();
