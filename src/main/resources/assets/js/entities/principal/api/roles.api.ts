import type { GraphQlRoot } from '../../../shared/api';
import type { PrincipalKey, PrincipalRef, Role, RoleKey } from '../model/principal.types';

const ROLES_SELECTION = `{
  key
  displayName
  description
  modifiedTime
  members {
    key
    type
    displayName
  }
}`;

/**
 * The root field and selection for the role list, exported so a screen that needs roles alongside other
 * domains can put them in one document. What the wire looks like stays here either way.
 */
export const ROLES_ROOT: GraphQlRoot = { field: 'roles', selection: ROLES_SELECTION };

type PrincipalRefDto = {
  key: string;
  type: PrincipalRef['type'];
  displayName: string;
};

type RoleDto = {
  key: string;
  displayName: string;
  description: string | null;
  modifiedTime: string | null;
  members: PrincipalRefDto[];
};

export type RolesData = { roles: RoleDto[] | null };

export function toRoles(dtos: readonly RoleDto[]): Role[] {
  return dtos.map(toRole);
}

//
// * Helpers
//

// An empty string is absence, not a value: the details panel falls back on a missing description
// and would otherwise render a blank field.
function nonEmpty(value: string | null): string | undefined {
  return value != null && value.length > 0 ? value : undefined;
}

function toRole(dto: RoleDto): Role {
  return {
    type: 'role',
    key: dto.key as RoleKey,
    displayName: dto.displayName,
    description: nonEmpty(dto.description),
    modifiedTime: nonEmpty(dto.modifiedTime),
    members: dto.members.map(toPrincipalRef),
  };
}

function toPrincipalRef(dto: PrincipalRefDto): PrincipalRef {
  return {
    key: dto.key as PrincipalKey,
    type: dto.type,
    displayName: dto.displayName,
  };
}
