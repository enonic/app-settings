import { GraphQLString, nonNull, type GraphQLType } from '/lib/graphql';

import { generator } from '../schema/generator';
import { displayNameOf, type ProjectSource } from './project.source';

export const ProjectType: GraphQLType = generator.createObjectType({
  name: 'Project',
  description: 'A Content Studio project or layer.',
  fields: {
    id: {
      type: nonNull(GraphQLString),
      description: 'Project name. Its roles are keyed `role:cms.project.<id>.<projectRole>`.',
    },
    displayName: {
      type: nonNull(GraphQLString),
      description: 'Falls back to the id when the project declares none.',
      resolve: (env: { source: ProjectSource }) => displayNameOf(env.source),
    },
  },
});
