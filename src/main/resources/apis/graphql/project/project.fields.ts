import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listProjects } from './project.source';
import { ProjectType } from './project.types';

export const projectQueryFields: GraphQLFields = {
  projects: {
    type: list(nonNull(ProjectType)),
    description: 'Every Content Studio project and layer, sorted by display name.',
    resolve: () => listProjects(),
  },
};
