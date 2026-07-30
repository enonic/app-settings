import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listApplications } from './application.source';
import { ApplicationType } from './application.types';

export const applicationQueryFields: GraphQLFields = {
  applications: {
    type: nonNull(list(nonNull(ApplicationType))),
    description: 'Every installed application, sorted by display name.',
    resolve: () => listApplications(),
  },
};
