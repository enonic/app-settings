import {
  findUsers,
  getMemberships,
  getPrincipal,
  getProfile,
  type User,
  type UserKey,
} from '/lib/xp/auth';

import { byName, toPrincipalItem, type PrincipalItem } from './principal.source';

export type UserSource = User;

/** One page of users, and how many the search matched in total. */
export type UserPage = {
  total: number;
  hits: User[];
};

/** The orders the list offers. An id, never a raw expression: `sort` is parsed, so it is injectable. */
export type UserSort = 'displayNameAsc' | 'displayNameDesc';

export type UserQuery = {
  start?: number;
  count?: number;
  search?: string;
  idProviders?: readonly string[];
  sort?: UserSort;
};

const DEFAULT_COUNT = 50;

// ! A page size clamped at both ends, and the lower bound is the interesting one: `count: -1` is
// ! `GET_ALL_SIZE_FLAG` to `findUsers`, i.e. every user, which on a directory-backed install means the
// ! whole directory read inside the app's single JS thread — so an upper bound alone would not do, since
// ! `Math.min(-1, 100)` is `-1`. Zero stays allowed: it asks for the total without a single row, the same
// ! trick `id-provider.source.ts` counts principals with — `SecurityServiceImpl` takes the total from the
// ! search rather than from the hits, so a page of none still reports how many matched.
const MIN_COUNT = 0;
const MAX_COUNT = 100;

/**
 * ! How far paging may reach, and it is a real limit rather than a nicety. Elasticsearch refuses a query
 * ! whose `from + size` passes `index.max_result_window` — 10 000 by default, and XP's
 * ! `search-settings.json` does not raise it — with a `QueryPhaseExecutionException` that
 * ! `SecurityServiceImpl.query` does not catch (it catches only `NodeNotFoundException`). The `users`
 * ! field would then error and the whole list would blank. Two hundred `Load more` clicks reach it, so
 * ! this is not a hypothetical on the installs this section exists for. Clamped rather than refused: a
 * ! caller asking beyond the window gets the last page it can have, not a broken screen.
 */
const MAX_START = 10_000 - MAX_COUNT;

/**
 * `displayName` and `_allText`, the pair XP itself searches principals on.
 *
 * `findPrincipals` builds this expression in `PrincipalQueryNodeQueryTranslator`; `findUsers` takes a
 * raw constraint expression instead, so the same thing has to be written here. Both halves are kept:
 * `fulltext` matches whole words, `ngram` matches a prefix as it is typed.
 */
const SEARCH_FIELDS = '_allText,displayName';

/**
 * Sort expressions, with the node path breaking ties.
 *
 * ! The tie-break is what makes paging sound: over a partial order, two users sharing a display name can
 * ! swap places between requests, and a row then appears on two pages or on none.
 *
 * ! It has to be `_path`, and the reasoning is worth keeping because the obvious candidates both fail.
 * ! `principalKey` is declared in `PrincipalIndexConfigFactory` but **never written**: `toCreateNodeParams`
 * ! stores only `displayName`, `principalType`, `userStoreKey` and the type-specific fields, and index
 * ! config for an absent property produces no index item — so ordering by it is silently ignored
 * ! (`SortQueryBuilderFactory` sets `unmappedType`, so it does not even error). `_name` is written and
 * ! orderable (`NodeStoreDocumentFactory` indexes it `FULLTEXT`) but is only unique **within a provider**,
 * ! so two providers holding an `alice` leave the order partial again. `_path` is written `IndexConfig.PATH`
 * ! and is unique repo-wide, which makes the order total.
 *
 * Ordering is case-insensitive for free: `OrderByValueResolver` lowercases what it writes to `_orderby`.
 */
const SORT_EXPRESSIONS: Record<UserSort, string> = {
  displayNameAsc: 'displayName ASC, _path ASC',
  displayNameDesc: 'displayName DESC, _path ASC',
};

export function listUsers({ start, count, search, idProviders, sort }: UserQuery): UserPage {
  const { total, hits } = findUsers({
    start: clampStart(start),
    count: clampCount(count),
    query: queryExpression(search, idProviders),
    sort: SORT_EXPRESSIONS[sort ?? 'displayNameAsc'],
  });

  return { total, hits };
}

/**
 * Null for a key no user answers to, which is a legitimate answer rather than a failure.
 *
 * Two guards, because one is not enough:
 *
 * ! The shape check keeps the field honest about *what* it answers for. `getPrincipal` answers for whatever
 * ! a key names, so `group:system:editors` would come back as a group and be served as a user — with its
 * ! memberships read as that user's.
 *
 * ! The `catch` keeps it honest about *failing*. This pattern is only a superset of what XP accepts:
 * ! `PrincipalKey.ofUser` validates the id through `ID_VALIDATOR`, which rejects spaces and HTML specials
 * ! among others, and **throws** rather than returning nothing. Replicating that charset here would be a
 * ! second copy to keep in step, so the throw is caught instead — a key the platform will not parse names
 * ! no user, which is exactly what null says.
 */
const USER_KEY = /^user:[^:]+:[^:]+$/;

export function getUser(key: string): User | null {
  if (!USER_KEY.test(key)) {
    return null;
  }

  try {
    return getPrincipal(key as UserKey);
  } catch {
    return null;
  }
}

export type PublicKeyItem = {
  kid: string;
  publicKey?: string;
  label?: string;
  creationTime?: string;
};

type PublicKeyProfile = {
  publicKeys?: PublicKeyItem | PublicKeyItem[];
};

// ! A single key comes back as an object, not an array of one: a `PropertyTree` property with one
// ! value reads as that value, which is why app-users runs every such read through `util.forceArray`.
export function listUserPublicKeys(key: UserKey): PublicKeyItem[] {
  const profile = getProfile<PublicKeyProfile>({ key });
  const keys = profile?.publicKeys;

  if (keys == null) {
    return [];
  }

  return Array.isArray(keys) ? keys : [keys];
}

export function listUserRoles(key: UserKey): PrincipalItem[] {
  return membershipsOf(key, 'role');
}

export function listUserGroups(key: UserKey): PrincipalItem[] {
  return membershipsOf(key, 'group');
}

// *
// * Helpers
// *

/**
 * ! Escapes a value for a query-DSL string literal, and is the only place that does.
 *
 * ! The grammar reads string literals with jparsec's double-quote tokenizer, which honours backslash
 * ! escapes — so a backslash and a double quote are what have to be escaped, backslash first or the
 * ! second pass would escape the escapes. app-users interpolates the search box straight into the
 * ! expression (`textQuery` in its `lib/principals.js`), where one typed `"` produces an unparseable
 * ! query; that is the bug this exists to not repeat.
 */
export function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * The constraint expression: the search, the provider filter, both, or nothing.
 *
 * `findUsers` adds only `principalType = USER` of its own (`UserQueryNodeQueryTranslator`), so every
 * other narrowing belongs here. The provider lives on the node under its old name, `userStoreKey`.
 */
function queryExpression(search?: string, idProviders?: readonly string[]): string {
  const parts: string[] = [];

  const needle = search?.trim();
  if (needle != null && needle.length > 0) {
    const args = `"${SEARCH_FIELDS}","${escapeQueryValue(needle)}","AND"`;
    parts.push(`(fulltext(${args}) OR ngram(${args}))`);
  }

  // Several providers are an OR of the same constraint, so the filter can tick more than one, as the
  // client-side filters of the other sections do.
  const providers = (idProviders ?? []).filter((provider) => provider.length > 0);
  if (providers.length > 0) {
    const constraints = providers
      .map((provider) => `userStoreKey="${escapeQueryValue(provider)}"`)
      .join(' OR ');
    parts.push(providers.length === 1 ? constraints : `(${constraints})`);
  }

  return parts.join(' AND ');
}

function clampCount(count?: number): number {
  return Math.min(Math.max(count ?? DEFAULT_COUNT, MIN_COUNT), MAX_COUNT);
}

function clampStart(start?: number): number {
  return Math.min(Math.max(start ?? 0, 0), MAX_START);
}

/**
 * ! Transitive, which is the whole reason this is worth a call: a role a user holds through a group is a
 * ! role that user has, and a panel listing only direct memberships would show `Roles (0)` for an
 * ! administrator who is an administrator through `system:administrators`. `getMemberships` defaults to
 * ! direct memberships only — `transitive` gates `getAllMemberships` in `GetMembershipsHandler` — so the
 * ! flag is not optional here. Groups are transitive for the same reason: a group inside a group is one
 * ! the user is effectively in.
 */
function membershipsOf(key: UserKey, type: 'role' | 'group'): PrincipalItem[] {
  return getMemberships(key, true)
    .filter((membership) => membership.type === type)
    .map(toPrincipalItem)
    .sort((a, b) => byName(a.displayName, b.displayName));
}
