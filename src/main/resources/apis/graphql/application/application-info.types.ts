import { GraphQLString, list, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import {
  listComponentItems,
  listMacroItems,
  listSchemaItems,
  listTaskItems,
  type ApplicationInfoSource,
} from './application-info.source';

const ApplicationItemType: GraphQLType = generator.createObjectType({
  name: 'ApplicationItem',
  description: 'One schema, component or macro descriptor an application contributes.',
  fields: {
    key: {
      type: nonNull(GraphQLString),
      description: 'Qualified name, `<application>:<name>`.',
    },
    name: {
      type: nonNull(GraphQLString),
      description: 'Name without the application prefix.',
    },
    displayName: {
      type: nonNull(GraphQLString),
      description: 'Descriptor title, falling back to the name.',
    },
    description: {
      type: GraphQLString,
    },
  },
});

const applicationItems = nonNull(list(nonNull(ApplicationItemType)));

export const ApplicationInfoType: GraphQLType = generator.createObjectType({
  name: 'ApplicationInfo',
  description: 'Detailed information about what an installed application provides.',
  // ! One jar-resource walk per field, so every one of them stays lazy: selecting `parts` must not
  // ! pay for the other six. Never resolve these in the parent, however tempting a single call is.
  fields: {
    contentTypes: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listSchemaItems(env.source.key, 'CONTENT_TYPE'),
    },
    mixins: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) => listSchemaItems(env.source.key, 'MIXIN'),
    },
    formFragments: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listSchemaItems(env.source.key, 'FORM_FRAGMENT'),
    },
    pages: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'PAGE'),
    },
    parts: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'PART'),
    },
    layouts: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'LAYOUT'),
    },
    macros: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) => listMacroItems(env.source.key),
    },
    tasks: {
      type: applicationItems,
      resolve: (env: { source: ApplicationInfoSource }) => listTaskItems(env.source.key),
    },
  },
});
