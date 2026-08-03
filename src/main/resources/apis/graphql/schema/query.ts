import { type GraphQLType } from '/lib/graphql';

import { applicationQueryFields } from '../application/application.fields';
import { groupQueryFields } from '../principal/group.fields';
import { idProviderQueryFields } from '../principal/id-provider.fields';
import { roleQueryFields } from '../principal/role.fields';
import { userQueryFields } from '../principal/user.fields';
import { projectQueryFields } from '../project/project.fields';
import { generator } from './generator';

/**
 * ! Every root field here is nullable, and that is load-bearing rather than sloppy. A screen asks for
 * ! several root fields in one document — the app gets one JS thread, so one request per screen is the
 * ! only way to make it cheap — and a field error propagates up through non-null positions, nullifying
 * ! the whole `data` entry when every position on the way is non-null. A non-null root field would
 * ! therefore take every other domain on the screen down with it: a failing `projects` would blank the
 * ! Roles list instead of only the filter that needs it. Nullable, the failure stays in its own field and
 * ! each domain gets its own verdict. Do not "tidy" these back to `nonNull(list(…))` — see the client
 * ! notes in `docs/unified-api.md` and the `lib-graphql` entry in `docs/platform-facts.md`.
 */
export const QueryType: GraphQLType = generator.createObjectType({
  name: 'Query',
  description:
    'Read access to everything the Settings sections manage. A list field is null only when reading it failed; the accompanying error says why.',
  fields: {
    ...applicationQueryFields,
    ...userQueryFields,
    ...roleQueryFields,
    ...groupQueryFields,
    ...idProviderQueryFields,
    ...projectQueryFields,
  },
});
