import type { ResultAsync } from 'neverthrow';

import { requestGraphQlDocument, type AppError, type GraphQlRoot } from '../../../shared/api';
import type {
  Group,
  GroupDetail,
  GroupKey,
  PrincipalKey,
  PrincipalRef,
} from '../model/principal.types';

const GROUP_FIELDS = `
  key
  displayName
  description
`;

/**
 * The group list, and deliberately without the members or the roles.
 *
 * ! Two calls per group — `getMembers` plus `getMemberships` — and neither has a cheap count behind it, so
 * ! there is not even a `total` to ask for instead. Groups are the half of this that could not wait:
 * ! roles are bounded, groups are not. Both fields are off `Group` in the schema, and the panel reads
 * ! them through `group(key)` for the one row that is selected.
 */
const GROUPS_SELECTION = `{${GROUP_FIELDS}}`;

/**
 * The root field and selection for the group list, exported so a screen that needs groups alongside
 * other domains can put them in one document. What the wire looks like stays here either way.
 */
export const GROUPS_ROOT: GraphQlRoot = { field: 'groups', selection: GROUPS_SELECTION };

const PRINCIPAL_REF_FIELDS = `
  key
  type
  displayName
`;

/**
 * One group with its members and its roles, for the details panel. A document rather than a root, because
 * null — the key names no group — is a legitimate answer.
 */
const GROUP_DOCUMENT = `
  query Group($key: String!) {
    group(key: $key) {${GROUP_FIELDS}
      members {${PRINCIPAL_REF_FIELDS}}
      roles {${PRINCIPAL_REF_FIELDS}}
    }
  }
`;

type PrincipalRefDto = {
  key: string;
  type: PrincipalRef['type'];
  displayName: string;
};

type GroupDto = {
  key: string;
  displayName: string;
  description: string | null;
};

type GroupDetailDto = GroupDto & {
  members: PrincipalRefDto[];
  roles: PrincipalRefDto[];
};

export type GroupsData = { groups: GroupDto[] | null };

/** `group` is null for a key nothing answers to, which is an answer rather than a failure. */
type GroupDetailData = { group: GroupDetailDto | null };

export function toGroups(dtos: readonly GroupDto[]): Group[] {
  return dtos.map(toGroup);
}

/** The group a details panel shows. `undefined` for a key nothing answers to. */
export function fetchGroupDetail(
  key: string,
  signal?: AbortSignal,
): ResultAsync<GroupDetail | undefined, AppError> {
  return requestGraphQlDocument<GroupDetailData>(GROUP_DOCUMENT, { key }, signal).map(
    ({ group }) =>
      group == null
        ? undefined
        : {
            ...toGroup(group),
            members: group.members.map(toPrincipalRef),
            roles: group.roles.map(toPrincipalRef),
          },
  );
}

//
// * Helpers
//

function toGroup(dto: GroupDto): Group {
  return {
    type: 'group',
    key: dto.key as GroupKey,
    displayName: dto.displayName,
    description: nonEmpty(dto.description),
  };
}

function toPrincipalRef(dto: PrincipalRefDto): PrincipalRef {
  return {
    key: dto.key as PrincipalKey,
    type: dto.type,
    displayName: dto.displayName,
  };
}

// An empty string is absence, not a value: the details panel omits a missing description and would
// otherwise render a blank field.
function nonEmpty(value: string | null): string | undefined {
  return value != null && value.length > 0 ? value : undefined;
}
