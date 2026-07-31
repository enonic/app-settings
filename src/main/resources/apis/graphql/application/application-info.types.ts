import { GraphQLString, list, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import {
  listComponentItems,
  listSchemaItems,
  type ApplicationInfoSource,
} from './application-info.source';

const SiteItemType: GraphQLType = generator.createObjectType({
  name: 'SiteItem',
  description: 'One schema or component descriptor an application contributes.',
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

const siteItems = nonNull(list(nonNull(SiteItemType)));

const SiteType: GraphQLType = generator.createObjectType({
  name: 'Site',
  description: 'What an application contributes to the CMS, sorted by display name.',
  fields: {
    contentTypes: {
      type: siteItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listSchemaItems(env.source.key, 'CONTENT_TYPE'),
    },
    mixins: {
      type: siteItems,
      resolve: (env: { source: ApplicationInfoSource }) => listSchemaItems(env.source.key, 'MIXIN'),
    },
    formFragments: {
      type: siteItems,
      description: 'Reusable form fragments — what 7.x called x-data.',
      resolve: (env: { source: ApplicationInfoSource }) =>
        listSchemaItems(env.source.key, 'FORM_FRAGMENT'),
    },
    pages: {
      type: siteItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'PAGE'),
    },
    parts: {
      type: siteItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'PART'),
    },
    layouts: {
      type: siteItems,
      resolve: (env: { source: ApplicationInfoSource }) =>
        listComponentItems(env.source.key, 'LAYOUT'),
    },
  },
});

export const ApplicationInfoType: GraphQLType = generator.createObjectType({
  name: 'ApplicationInfo',
  description:
    'What an installed application provides. Kept apart from Application so that the ' +
    'expensive descriptor branches are unreachable from the applications list.',
  fields: {
    site: {
      type: nonNull(SiteType),
      // The container carries no data of its own — it hands the key to each leaf.
      resolve: (env: { source: ApplicationInfoSource }) => env.source,
    },
  },
});
