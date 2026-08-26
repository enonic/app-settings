import { list, nonNull, type GraphQLFields } from '/lib/graphql';

import { listIdProviderApplications } from './application.source';
import { IdProviderApplicationType } from './application.types';

// ? One id-provider field in a folder named `application`, which reads oddly until you ask who
// ? wants it: the ID Providers editor, not an Applications screen. The applications domain had two
// ? consumers and only the first moved to app-applications in Phase 3.2 — this is the remainder,
// ? left physically where it was rather than renamed, because Phase 4.2 takes it to app-users and
// ? moving it twice buys nothing.
export const applicationQueryFields: GraphQLFields = {
  idProviderApplications: {
    type: list(nonNull(IdProviderApplicationType)),
    description:
      'Applications that ship an id provider descriptor, i.e. those a provider can be bound to.',
    resolve: () => listIdProviderApplications(),
  },
};
