import type { GraphQlRoot } from '../../../shared/api';
import type { Group, GroupKey, PrincipalKey, PrincipalRef } from '../model/principal.types';

const GROUPS_SELECTION = `{
  key
  displayName
  description
  members {
    key
    type
    displayName
  }
  roles {
    key
    type
    displayName
  }
}`;

/**
 * The root field and selection for the group list, exported so a screen that needs groups alongside
 * other domains can put them in one document. What the wire looks like stays here either way.
 */
export const GROUPS_ROOT: GraphQlRoot = { field: 'groups', selection: GROUPS_SELECTION };

type PrincipalRefDto = {
  key: string;
  type: PrincipalRef['type'];
  displayName: string;
};

type GroupDto = {
  key: string;
  displayName: string;
  description: string | null;
  members: PrincipalRefDto[];
  roles: PrincipalRefDto[];
};

export type GroupsData = { groups: GroupDto[] | null };

export function toGroups(dtos: readonly GroupDto[]): Group[] {
  return dtos.map(toGroup);
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
    members: dto.members.map(toPrincipalRef),
    roles: dto.roles.map(toPrincipalRef),
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
