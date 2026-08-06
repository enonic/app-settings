import type { ResultAsync } from 'neverthrow';

import { requestGraphQlDocument, type AppError, type GraphQlRoot } from '../../../shared/api';
import type {
  PrincipalKey,
  PrincipalRef,
  PublicKey,
  User,
  UserDetail,
  UserKey,
} from '../model/principal.types';

const USER_FIELDS = `
  key
  displayName
  login
  email
  idProvider
  hasPassword
`;

/**
 * The user list, one page at a time.
 *
 * ! Users is the only section the server narrows: search, provider filter, order and paging all happen
 * ! in `findUsers`, because a directory-backed install holds more users than a screen can load whole —
 * ! see the `findUsers` entry in `docs/platform-facts.md`. Every argument therefore rides as a variable;
 * ! nothing typed into the search box becomes part of the document.
 */
export const USERS_ROOT: GraphQlRoot = {
  field: 'users',
  args: '(start: $start, count: $count, search: $search, idProviders: $idProviders, sort: $sort)',
  variables: {
    start: 'Int',
    count: 'Int',
    search: 'String',
    idProviders: '[String]',
    sort: 'UserSort',
  },
  selection: `{
  total
  hits {${USER_FIELDS}}
}`,
};

const PUBLIC_KEY_FIELDS = `
  publicKeys {
    kid
    label
    creationTime
  }
`;

const MEMBERSHIP_FIELDS = `
  roles {
    key
    type
    displayName
  }
  groups {
    key
    type
    displayName
  }
`;

/**
 * What the details panel is missing when it already has the row: the memberships and nothing else.
 *
 * A row carries every scalar the panel shows — the list selected them — so asking for them again would
 * be re-reading what is on screen. Only the roles and groups are absent from a row, because they are a
 * `getMemberships` call per user and no list can afford one per row.
 */
const USER_MEMBERSHIPS_DOCUMENT = `
  query UserMemberships($key: String!) {
    user(key: $key) {${MEMBERSHIP_FIELDS}${PUBLIC_KEY_FIELDS}}
  }
`;

/**
 * The whole user, for when the panel has no row to build on: a link opened straight at
 * `/users/<key>`, or a search that has since narrowed the loaded page away from it.
 *
 * Null is a legitimate answer to both documents — the key may name nobody — which is why they travel as
 * documents rather than as roots.
 */
const USER_DOCUMENT = `
  query User($key: String!) {
    user(key: $key) {${USER_FIELDS}${MEMBERSHIP_FIELDS}${PUBLIC_KEY_FIELDS}}
  }
`;

type UserDto = {
  key: string;
  displayName: string;
  login: string;
  email: string | null;
  idProvider: string;
  hasPassword: boolean;
};

export type UsersPageDto = {
  total: number;
  hits: UserDto[];
};

export type UsersData = { users: UsersPageDto | null };

type PrincipalRefDto = {
  key: string;
  type: PrincipalRef['type'];
  displayName: string;
};

type PublicKeyDto = {
  kid: string;
  label: string | null;
  creationTime: string | null;
};

type UserDetailDto = UserDto & {
  roles: PrincipalRefDto[];
  groups: PrincipalRefDto[];
  publicKeys: PublicKeyDto[];
};

type MembershipsDto = {
  publicKeys: PublicKeyDto[];
  roles: PrincipalRefDto[];
  groups: PrincipalRefDto[];
};

/** `user` is null for a key nothing answers to, which is an answer rather than a failure. */
type UserDetailData = { user: UserDetailDto | null };

type UserMembershipsData = { user: MembershipsDto | null };

/**
 * The whole user, for a panel with no row to build on. `undefined` for a key nothing answers to.
 */
export function fetchUserDetail(
  key: string,
  signal?: AbortSignal,
): ResultAsync<UserDetail | undefined, AppError> {
  return requestGraphQlDocument<UserDetailData>(USER_DOCUMENT, { key }, signal).map(({ user }) =>
    user == null ? undefined : { ...toUser(user), ...toMemberships(user) },
  );
}

/**
 * The row the list already holds, completed with what only a by-key read can answer: its roles and
 * groups. Cheaper than the whole user, and every other field is already on screen.
 */
export function fetchUserMemberships(
  row: User,
  signal?: AbortSignal,
): ResultAsync<UserDetail | undefined, AppError> {
  return requestGraphQlDocument<UserMembershipsData>(
    USER_MEMBERSHIPS_DOCUMENT,
    { key: row.key },
    signal,
  ).map(({ user }) => (user == null ? undefined : { ...row, ...toMemberships(user) }));
}

export type UsersPage = {
  total: number;
  items: User[];
};

export function toUsersPage({ total, hits }: UsersPageDto): UsersPage {
  return { total, items: hits.map(toUser) };
}

//
// * Helpers
//

function toMemberships(dto: MembershipsDto): Pick<UserDetail, 'roles' | 'groups' | 'publicKeys'> {
  return {
    roles: dto.roles.map(toPrincipalRef),
    groups: dto.groups.map(toPrincipalRef),
    publicKeys: dto.publicKeys.map(toPublicKey),
  };
}

function toPublicKey(dto: PublicKeyDto): PublicKey {
  return {
    kid: dto.kid,
    label: dto.label ?? undefined,
    creationTime: dto.creationTime ?? undefined,
  };
}

function toPrincipalRef(dto: PrincipalRefDto): PrincipalRef {
  return {
    key: dto.key as PrincipalKey,
    type: dto.type,
    displayName: dto.displayName,
  };
}

function toUser(dto: UserDto): User {
  return {
    type: 'user',
    key: dto.key as UserKey,
    displayName: dto.displayName,
    login: dto.login,
    email: dto.email ?? undefined,
    idProvider: dto.idProvider,
    hasPassword: dto.hasPassword,
  };
}
