# Unified API

How this app talks to XP, and how the two apps it replaces get folded into one API layer. Tracked by
[#8](https://github.com/enonic/app-settings/issues/8).

## The problem

The two apps being replaced use different backend styles for the same kind of data:

- **`../app-applications`** — JAX-RS REST. 61 Java files, 3,622 LOC. Four endpoints, **all GET**: the
  app row, the app list, the "what does this app provide" aggregate, and the icon. Every mutation
  (install, start, stop, uninstall) already goes straight from the browser to XP core's `server:app`,
  and the Market call is already a browser `fetch` — neither is in the repo's Java.
- **`../app-users`** — GraphQL over `/lib/graphql`, resolvers mostly on `/lib/xp/auth` and
  `/lib/xp/node`. But 52 Java files / 2,949 LOC remain, and 19 of them are the entire ID-provider
  surface reached through `__.newBean`.

Target: **one GraphQL data layer** for all five sections, in this repo.

## Decisions

Settled — do not relitigate without a reason:

1. **GraphQL is the single data layer**, with one deliberate binary exception (jar upload). Icons were
   the second until GraalJS ruled a binary endpoint out; they now ride the schema as a `data:` uri.
2. **XP JS libs first. Java only where no JS binding exists**, and written as `MapSerializable`
   `ScriptBean`s from the start.
3. **Do not port app-applications' Java.** It is Jackson/JAX-RS serialization code
   (`ApplicationJson implements ItemJson`) with **zero** `MapSerializable` classes — 43 `*Json` classes
   / 2,506 LOC built to be written to an HTTP response, not handed to a script engine. Reusing it means
   rewriting all 43 or stringify-then-`JSON.parse`. Most of what it does is now free (see _Forms_ in `platform-facts.md`).
4. **Do bring app-users' `lib/auth/**`** (19 files) as-is. Already `MapSerializable`, already tested
   through `ScriptTestSupport` with golden JS fixtures — and those fixtures are the only thing pinning
   the `PropertyTree` wire format.
5. **Write the beans here and stop.** They are close to what XP's own lib handlers would be, so
   upstreaming stays possible later — but it is not this issue's job and nothing waits on it.
6. **`./gradlew check` becomes mandatory in CI** alongside `pnpm check`.
7. **Response types are hand-written. No codegen — decided, not deferred.** Introspection through
   Altair is the authoring aid; the type is written from the selection set. See _Writing queries_.

Java is not against the grain here: `src/main/java/.gitkeep` was already in the tree, and the
"dropping that framework is the point" line in `CLAUDE.md` is about lib-admin-ui, not the JVM.

## Verified platform facts

Moved to [`platform-facts.md`](platform-facts.md) — what XP actually does, as opposed to what its
types and documentation say, each entry naming the class that proves it. It was extracted because it
outlives this issue: the phases below age as they are finished, those facts do not until XP changes.

Read it before contradicting anything here about `lib-schema`, nullability of text from an XP lib,
what `findPrincipals` and `findUsers` can do, what GraalJS refuses to carry, or why `@enonic-types`
versions are pinned.

## Server layout

`app-users`' layout is _not_ the model — its `types/objects/` split, `{query}`/`{mutation}` body params
and one-class-per-operation client are all things to leave behind. Mirror the frontend's slice thinking
instead: one folder per domain, fixed segment suffixes.

```
src/main/resources/
  apis/graphql/
    graphql.yaml                     kind: API, allow: role:system.admin, no mount:
    graphql.ts                       controller — adminOnly(post), schema built at module scope
    schema/
      generator.ts                   the one schemaGenerator (module singleton)
      index.ts                       createSchema — the only place roots are assembled
      query.ts                       read root fields, one entry per domain
      mutation.ts                    write root fields, composed the same way
    application/
      application.types.ts           GraphQL object types
      application.fields.ts          the root fields this domain contributes
      application.source.ts          data access
      application-info.{types,source}.ts
    principal/                       (Phase 3)
  lib/icon.ts        lib/macro.ts    __.newBean wrappers — one per Java package of the same name
  lib/task.ts        lib/api.ts
  lib/admin-tool.ts  lib/webapp.ts
  lib/admin-extension.ts
  lib/idprovider.ts                  grows the app-users ID-provider surface in Phase 3
  types/graphql.d.ts
```

The Mutation root waited for its first field, because GraphQL forbids an object type with no fields; it
arrived with `deletePrincipals` ([#57](https://github.com/enonic/app-settings/issues/57)). A domain
contributes `<domain>MutationFields` from the same `*.fields.ts` as its query fields, so a domain's whole
schema surface stays in one file.

**`*.source.ts` is the only file that knows where data comes from.** An XP lib call today, a Java bean
call tomorrow, a lib call again when XP grows one — swapping never touches `*.types.ts` or
`*.fields.ts`, and never reaches the client. This is why GraphQL is worth the trouble here: the schema
is the contract, the sourcing is an implementation detail.

Segment rules, mirroring `.claude/rules/structure.md`:

- Suffixes are mandatory (`*.types.ts`, `*.fields.ts`, `*.source.ts`) so a plain grep keeps working.
- Everything is `.ts` — `vp pack`'s entry glob already covers `src/main/resources/**/*.ts`.
- Only `schema/index.ts` assembles roots. A domain never reaches into another domain's files.
- Wrap the handler in `adminOnly()` from `lib/auth.ts` even though `allow:` already restricts it.
- Resolvers never touch `__` directly. Bean calls go through a `lib/*.ts` wrapper returning plain
  objects, as app-users' `lib/auth.js` does.

### Java layout

```
src/main/java/com/enonic/app/settings/
  lib/icon/            EncodeApplicationIconHandler
  lib/macro/           ListMacrosHandler, MacroDescriptorMapper
  lib/task/            ListTaskDescriptorsHandler, TaskDescriptorMapper
  lib/admintool/       ListAdminToolsHandler, AdminToolDescriptorMapper
  lib/adminextension/  ListAdminExtensionsHandler, AdminExtensionDescriptorMapper
  lib/api/             ListApisHandler, ApiDescriptorMapper
  lib/webapp/          HasWebappHandler
  lib/idprovider/      GetIdProviderDescriptorHandler, IdProviderDescriptorMapper
                       + the 19 files from app-users land here in Phase 3
  handler/             KidGeneratorHandler                                          (Phase 3)
```

One package per entity, each backing one `lib/*.ts` of the same name — `com.enonic.xp.lib.schema` is the
model, and it is what makes the code disposable: when XP grows the lib we are standing in for, the
package and its wrapper are deleted together and the resolvers change by one import. Do **not** group
them by the abstraction they share (a `lib/descriptor/` holding four services' handlers): the shape that
matters is what a caller asks for, not that four services happen to return `Descriptors<T>`.

The TypeScript filename equals the Java package leaf, hyphenated where TS wants two words and
concatenated where Java does — `lib/adminextension/` ↔ `lib/admin-extension.ts`.

**A name already taken by an XP lib is not a conflict.** `/lib/task` sits beside `/lib/xp/task` exactly
as `/lib/auth` and `/lib/i18n` already sit beside theirs. Where the distinction needs stating, state it
in the exported function — `listTaskDescriptors`, not `listTasks`, because lib-task's `list()` returns
running instances.

Every handler implements `ScriptBean`, takes its OSGi services through `BeanContext.getService(...)`,
and returns `MapSerializable`. One bean per question, not one aggregate — a field-level bean lets
`applicationInfo { tasks { key } }` avoid computing the twelve branches nobody asked for, which is
exactly what app-applications' `ApplicationInfoService` gets wrong.

**Keep the Java branch-free.** Every fallback, default and sort belongs in the `*.source.ts` above it,
where vitest reaches it — a mapper that only reads getters has nothing a unit test would catch that the
live query would not, which is why there is no JUnit here. All fourteen mappers and handlers hold this;
the two exceptions are `EncodeApplicationIconHandler` and `GetIdProviderDescriptorHandler`, where a null
guard _is_ the answer ("this app ships no icon", "this app is no id provider") and cannot move up. Add
JUnit the first time a Java class needs a conditional that is not that.

## Client side

`entities/<domain>/api/*.api.ts` stays the only place that talks to the server
(`.claude/rules/requests.md`). GraphQL rides on the existing helper rather than replacing it:

```ts
// shared/api/graphql.ts — builds on requestJson, does not replace it.
// One root field. Fails when that field did not arrive.
export function requestGraphQl<T>(
  root: GraphQlRoot,
  signal?: AbortSignal,
): ResultAsync<T, AppError>;

// Several root fields in one document — a screen's whole read. Decides nothing about a null field.
export function requestGraphQlRoots<T>(
  roots: readonly GraphQlRoot[],
  name: string,
  signal?: AbortSignal,
): ResultAsync<{ data: T; message?: string }, AppError>;

// The escape hatch: a whole document. Arguments, variables, aliases, mutations.
export function requestGraphQlDocument<T>(
  query: string,
  variables?: GraphQlVariables,
  signal?: AbortSignal,
): ResultAsync<T, AppError>;
```

It posts the standard `{ query, variables }` envelope, maps a non-empty `errors[]` to an `AppError` so
failures stay values, and keeps one request in flight at a time (see _GraalJS_ in
`platform-facts.md`). "Do not add a second http helper" is respected: one transport, one error type, one
front door.

**A screen asks for everything it needs in one document.** One request is in flight at a time, so
several requests are several round trips, and batching root fields is the only thing that makes a screen
cheaper on a single-threaded engine. The Roles screen reads `roles`, `idProviders` and `projects`; it asks
for all three at once.

- **A read hands over a root field and a selection, not a finished document.** The transport names the
  operation after the field and builds `query Roles { roles … }`, so no api file writes query boilerplate
  and nothing has to parse query text back.
- **`requestGraphQlRoots` is the screen's entry point**: several roots, one document,
  `query RolesScreen { roles … idProviders … projects … }`. It hands back `data` as it arrived, with
  `null` where a field failed, plus whatever `message` the response carried — and decides nothing. What a
  failed field means is the screen's business, because the screen knows which fields it asked for and what
  each one feeds.
- **Where that composition lives is the point.** Entity slices may not import each other, so the lowest
  layer where three domains can be asked for together is the page — `pages/roles/api/roles-screen.api.ts`
  composes the roots each entity exports (`ROLES_ROOT`, `ID_PROVIDERS_ROOT`, `PROJECTS_ROOT`) and names no
  field of its own. Every selection and wire shape stays with the domain that owns it. FSD's own guidance
  is the same: compose slices on the layer above rather than reaching sideways.
- **`pages/<section>/model/<section>.screen.ts` fans the answer out** into the stores that own the parts,
  one verdict per domain, and owns the cancelling for the whole screen. That is why those stores hold no
  request: they expose `begin…Load` and `receive…` and nothing else.
- **Root fields are nullable so a failure stays in its own field**, which is what makes per-domain
  verdicts possible at all: § 6 of the spec propagates a resolver error up through non-null positions, so a
  non-null root field would nullify the whole `data` entry and take every other domain on the screen with
  it — a failing `projects` blanking the Roles list rather than only the filter that needs it.
  `serializeData` makes that total, since it omits `data` instead of sending `data: null`. The rationale
  sits on `QueryType` in `schema/query.ts`, where someone would otherwise tidy it back.
- The shared `message` is as far as attribution goes: lib-graphql drops the error `path` graphql-java
  attaches (`ExecutionResultMapper.serializeError`), so which message belongs to which field is unknowable.
  A screen gives it only to the domains that came back null.
- **`requestGraphQl` is for a root field that always resolves when it succeeds.** It fails when its own
  field is absent or null, which is what keeps the wire types in the api segment non-nullable — no mapper
  is ever handed a null. A field whose `null` is a legitimate answer — `applicationInfo` for an unknown key
  — reads as failure under that rule and belongs on `requestGraphQlDocument`, where `toData` hands null
  through untouched.
- **`requestGraphQlDocument`** takes a whole document, for arguments, variables, aliases and mutations.
  Any error fails it, since it cannot know which field the caller needed.
- A request still queued when its signal aborts is dropped before it reaches the network; one in flight is
  cancelled through the signal the transport forwarded. Every store guards on `signal.aborted` before
  writing regardless.

The endpoint url is **not** a parameter. It comes from the `$config` fact store in
`shared/config/config.store.ts`, set once at bootstrap in `main.ts` exactly as `setPhrases` populates
`$phrases`. An api file cannot receive props, and `.get()` outside a component is fine
(`.claude/rules/stores.md`) — this keeps url plumbing out of every api file while still honouring "urls
come from the tool config, never hardcoded".

**One operation per request.** `GraphQLHandler.execute` builds its `ExecutionInput` from `query`,
`context` and `variables` only — **`operationName` is ignored**, so a document holding several named
operations silently runs the wrong one rather than failing. The transport never sends the field, and
composing documents itself is what guarantees there is only ever one operation in them; a hand-written
document must hold to the same rule.

Response types are hand-written next to the query in the api segment, and stay that way (decision 7).
`graphql-codegen` was evaluated and rejected: the schema is code-first, so it exists only at runtime, and
feeding codegen means either a live XP instance in CI or a committed SDL snapshot plus a drift-check job
— a second source of truth for a schema this small, plus generated code in the tree. The two
zero-generation alternatives (`@0no-co/graphqlsp`, `gql.tada`) both lean on the TypeScript language
service, which the native TypeScript 7 compiler used here does not load plugins for, so they are not a
later fallback either. What replaces codegen's safety is introspection: read nullability off Altair's
docs panel rather than guessing, keep selection sets small, keep the wire type beside the query it
mirrors, and test the mapper.

Deliberately not copied from app-users: `{query}`/`{mutation}` as separate body params, a class per
operation, string interpolation into query text, and `GraphQlRequest`'s error handling (it resolves
`undefined` on transport failure and hangs `result.error` off the data object).

### Writing queries

Selection text, wire type, mapper and the `requestGraphQl` call all live in the same
`api/<subdomain>.api.ts`. Query text is a wire concern, so it never leaves the api segment.

```ts
// Shared between list rows and the detail header — compose, don't duplicate the field list.
const APPLICATION_FIELDS = `
  key
  displayName
  version
  state
`;

const APPLICATIONS_SELECTION = `{ ${APPLICATION_FIELDS} }`;

type ApplicationsResult = { applications: ApplicationRowDto[] };

export function fetchApplications(signal?: AbortSignal): ResultAsync<Application[], AppError> {
  return requestGraphQl<ApplicationsResult>(
    { field: 'applications', selection: APPLICATIONS_SELECTION },
    signal,
  ).map(({ applications }) => applications.map(toApplication));
}
```

Note what replaced the GraphQL fragment: a plain template literal spliced into the selection. A real
fragment would be a second definition in the document, which the transport does not compose — and reuse
across selections is all the fragment was ever for here.

A domain whose rows a screen needs beside another domain's exports its root and its mapper —
`ROLES_ROOT` and `toRoles` — so the screen's api file composes them without learning anything about the
wire. `fetchX` stays only where a section reads that domain alone, as ID Providers does.

The boundary either side of the api file is hard: **the api file never touches store state, and a store
never calls `requestGraphQl`.** The store command is where the `ResultAsync` is matched and
`status: 'loading' | 'ready' | 'error'` is set.

```
widget / page  →  model/*.store.ts (command)  →  api/*.api.ts (requestGraphQl)
```

Conventions:

- **Plain template literals, `UPPER_SNAKE` module consts.** Not separate `.graphql` files — Vite would
  serve those through `?raw`, but it splits the query from its type and its mapper, needs a `.d.ts`
  shim, and oxfmt/oxlint would not touch them.
- **A selection, not a document.** `requestGraphQl` names the operation after the root field, so
  `query Applications { … }` still shows up in the network panel and in Altair history without anyone
  writing it. (Not in errors: `ExecutionResultMapper.serializeError` emits no operation name.) Reach for
  `requestGraphQlDocument` only for what a root and a selection cannot express, knowing it forfeits
  merging.
- **Variables, never interpolation.** `query Application($key: String!)` with `{ key }` passed as
  variables — never `${key}` inside the query text. A selection interpolating a shared field list is a
  different thing and is fine: it is our own constant, not input.
- **Two queries per domain, not one.** A thin list query and a fat detail query. This is the actual gain
  over the REST version, where `/application/list` returned all 19 fields per app — config forms
  included — for a list that renders four of them.
- **The wire type mirrors the selection set exactly**, named `<RootField>Result`, `type` not `interface`.
  Nullability comes from the schema via Altair's docs panel, not from guessing. Domain types live in
  `model/<domain>.types.ts` and never carry a DTO shape.
- **Test the mapper, not the request** — stub `fetch`, assert mapped domain values and the error result,
  per `.claude/rules/testing.md`.

Authoring loop: build the query in Altair against the live schema with autocomplete, then paste the
working text into the api file and hand-write the matching `*Result` type from the selection set.

## Exploring the schema

**Introspection is enabled.** `GraphQLHandler.execute` calls `GraphQL.newGraphQL(schema).build()` with no
instrumentation, and graphql-java enables introspection by default; `ExecutionResultMapper` → `MapMapper`
serializes the result map recursively, so the nested payload survives the Java → JS boundary intact.
Nothing to configure, and nothing to switch off in production either — the whole API is behind
`role:system.admin`.

**Altair is the client we use**: it runs as a browser extension, so it reuses the existing XP session
cookie instead of needing one pasted in, and it is same-origin so CORS never enters the picture.

1. Log in to XP admin and open the Settings tool.
2. Read the endpoint out of the config island — `#settings-config-json` → `apis.graphql`. It must be the
   **admin-tool-scoped** url, not a bare `/api/...` path: `verifyPathMountedOnAdminTool` requires the
   request to arrive under the tool's base path.
3. Point Altair at it, method **POST**. There is no GET handler — a tool that probes with GET gets a 405.
4. Hit "Reload docs" to introspect.

Zero-setup fallback, from the browser console on the tool page:

```js
const url = JSON.parse(document.getElementById('settings-config-json').textContent).apis.graphql;
await (
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __schema { types { name } } }' }),
  })
).json();
```

## Phases

Each phase ends green on `pnpm check` **and** `./gradlew build`. A phase is its own issue and may land
over several PRs.

### Phase 1 — GraphQL scaffolding — **done** ([#20](https://github.com/enonic/app-settings/issues/20))

The layer with no domain in it: `apis/graphql/{graphql.yaml,graphql.ts}` + `schema/`,
`types/graphql.d.ts` with its `paths` entry, `lib-graphql:3.0.0` in `build.gradle`, `"graphql"` in
`main.yaml`'s `apis:`, an `apis.graphql` url through `lib/config.ts` and `shared/config`,
`shared/api/graphql.ts`, and a `lib-graphql` double in `src/test/mocks/` with its `test.alias` entry.

### Phase 2 — app-applications on GraphQL — **done** ([#21](https://github.com/enonic/app-settings/issues/21))

Every field the Applications section reads now comes from this schema: `applications` (list, `lib-app`)
and `applicationInfo(key)` with thirteen lazy fields, on `lib-app`, `lib-schema` and eight Java beans —
`/lib/icon`, `/lib/macro`, `/lib/task`, `/lib/admin-tool`, `/lib/admin-extension`, `/lib/api`,
`/lib/webapp`, `/lib/idprovider`. `../app-applications`' Java has no remaining behaviour this app cannot
produce, and `FormMapper` was never needed — no section renders a form.

**Schema shape:**

- **Two root fields rather than one type.** Keeping the descriptor branches on a separate type makes them
  unreachable from the list field, which matters because lib-graphql offers no query-cost analysis, so
  `applications { parts }` would otherwise walk every installed app's jar.
- **`ApplicationInfo` is flat**, no `site` container — grouping the lists is the panel's job and a
  container only adds a hop. Every field resolves on its own, so selecting `parts` does not pay for
  content types: the opposite of app-applications' `/info`, which computes all thirteen branches
  unconditionally and has no cache.
- **`idProvider { mode usedBy }` is the one nested field, and the nesting earns its keep** — the two facts
  are heterogeneous and `usedBy` is meaningless at the top level. It is also the only container that is
  not free: it reads the descriptor to decide null-versus-object (one cached `processResource`, segment
  `authDescriptor`) and hands `mode` over with it, while `usedBy` stays lazy. Three nullability facts,
  each stated once: `idProvider` null means not an id provider at all, `mode` null means the descriptor
  omitted `mode:`, `usedBy` is non-null but often empty. A freshly installed id provider app shows the
  section with no `usedBy` row — correct, not missing data.
- **Three admin-extension services, so three item types.** `adminTools`, `adminExtensions` and `apis` are
  the lists that do not fit `ApplicationItem`, since each carries one extra field (`url`, `interfaces`,
  `documentationUrl`). The four common fields live in an `itemFields` object the object types spread;
  lib-graphql's builder has no inheritance, and widening the shared type would leak those fields into the
  other eight lists.
- **Icons are a `data:` uri on `Application.icon`.** An `apis/icon/` endpoint was abandoned and cannot be
  revived while the app runs on GraalJS (see _GraalJS_ in `platform-facts.md`), so `lib/icon` base64-encodes on the Java side.
  Cost: no HTTP caching, and every query selecting the field re-reads and re-encodes every icon (~93 KB
  base64 on a stock install, 90% of it one app). app-applications avoids this only by serving icons from a
  JAX-RS resource, i.e. no JS at all — reconsider if the payload ever bites.

**What the beans settled against app-applications:**

- **`MacroDescriptorService.getByApplication(key)` is the right call.** app-applications uses
  `getByApplications(key, SYSTEM)` and filters the system macros back out in the browser
  (`ApplicationDataContainer.ts:110`) — a round trip with no purpose. Its `MacroDescriptorJson` also
  serializes a whole `FormJson` tree the panel never reads; ours emits key, title, description and the
  two i18n keys, which is all any of these sections display.
- **`TaskDescriptor extends Descriptor`, which carries the key alone — there is no title.** The mapper
  emits key, description and `descriptionI18nKey`, the source passes `undefined` for the title, and
  `displayName` falls back to the name. app-applications rendered the full qualified key.
- **The admin tool url is not Java.** app-applications assembles `/admin/<app>/<name>` from the servlet
  request; `lib-admin`'s `getToolUrl(application, name)` already answers it, so the mapper omits it and
  `listAdminToolItems` builds it — the same lib the tool config already uses.
- **`interfaces` defaults to `[]` in the source.** The schema promises a non-null list and the bridge
  drops an empty array rather than sending one: the nullability trap, one level out.
- **Web App is existence of `/webapp/webapp.js`, nothing more.** app-applications executes that
  controller through `PortalScriptService` and checks for exported `get`/`post`/`head`/`all` — running
  another application's top-level code every time an admin opens the panel. `WebappService.getDescriptor`
  is not the test either: a webapp needs no `webapp.yml`. The url is a path built in TypeScript, always
  `/webapp/<key>`; null means "no webapp" and the panel drops the section.
- **app-applications NPEs on a descriptor without a mode.** `IdProviderApplicationJson` calls
  `getMode().toString()` unguarded, and because `/info` computes every branch eagerly, one malformed
  `idprovider.yaml` takes out the whole details panel rather than one section.
- Skipped deliberately: `mount` and `allowedPrincipals` on apis, `apiMounts` and `schemaConfig` on tools.
  app-applications serializes all of them and renders none.

**Deliberately not in this phase**, because none of it is API-layer work: `"server:app"` in `main.yaml`
with its five urls through `lib/config.ts`, an `application(key)` root field for `/applications/$id`
deep-links (free to add — multiple roots in one document cost no extra request), and the client
`entities/application/` slice. They belong to the Applications section screen. The Market lookup for
"available version" is the one data gap left, and it is a Phase 4 item because where it runs is still
open.

### Phase 3 — app-users on GraphQL — **in progress**

**All five principal sections read through the schema; no fixture is left in the tree.** Users came last
and as its own issue (#37), because it is the only section that cannot load whole.

`apis/graphql/principal/` contributes these root fields on `lib-auth`:

- `roles` and `groups` on `findPrincipals` with `count: -1`, which is `NodeSearchService.GET_ALL_SIZE_FLAG`
  — the default is 10 and truncates silently without it. Neither carries a member list; see _Member lists
  on demand_ below.
- `idProviders` on `getIdProviders`, with `IdProvider.application` naming the bound application from its
  own descriptor, and `users` / `groups` as a `PrincipalSet` whose `total` costs a `count: 0` search and
  whose `items` is deliberately never selected by the list query — a provider may hold a whole corporate
  directory. No `roles` field: that aggregate has no cheap query behind it, see #23.
- `idProvider(key)` and `defaultIdProviderPermissions`, which the provider dialog needs. Both answer in
  `IdProviderPermission`s, and both go through Java — `lib/xp/auth` exposes neither an access control
  list nor a read-one. `IdProvider.permissions` is one bean call, so no list query selects it.

The Applications domain gained `idProviderApplications` for the same dialog: the installed applications
that ship an `idprovider` descriptor, one descriptor read each. `IdProviderDescriptor.hasConfig` says
whether the descriptor declares a config form without carrying the form, which waits on #64.

`users` and `user(key)` came with Users, and they are the only fields the server narrows: `findUsers`
takes a constraint expression and a sort expression, so search, provider filter, ordering and paging all
happen there. The provider filter takes `idProviders: [String]` rather than one key, joined as an OR of
`userStoreKey` constraints, so the Users filter can tick several as the client-side filters of the other
sections do. `User.publicKeys` reads the profile, one `getProfile` per user, and so stays off the list. Three things about that are load-bearing and written down in `platform-facts.md`: the sort
needs `_path` as a tie-break (`principalKey` is declared in the index config but never written to a node,
so ordering by it is silently ignored), the offset is clamped to the Elasticsearch result window, and
`getMemberships` needs `transitive: true` or an administrator's roles read as empty. The one place that
interpolates a value into a query string escapes it, and it is the only such place.

A second domain came with the earlier three: `apis/graphql/project/` contributes `projects` on
`lib-project`, which the Roles filter needs because a role key carries the project id
(`role:cms.project.<id>.<projectRole>`) while the filter shows display names. `include xplibs.project`
is in `build.gradle`.

No Java was needed for any of the three, and `graphql.d.ts` was not extended — none of them needs an
interface type. Users almost certainly will.

#### Member lists on demand ([#40](https://github.com/enonic/app-settings/issues/40))

**A member list is unreachable from a list field, in the schema and not only in the selection.**
`role(key): RoleDetail` and `group(key): GroupDetail` carry them; `Role` and `Group` do not. The split is
the one `applications` versus `applicationInfo(key)` already makes, and for the same reason: lib-graphql
has no query-cost analysis, so a field that is merely expensive is a field someone will select. Measured
against 113 roles and 200 groups, a list load went from 114 and 401 `lib-auth` calls to **one each**, and
opening a panel costs 2 calls for a role and 3 for a group.

Three things about that split are worth keeping:

- **The detail type repeats the scalars, and that is not duplication.** `getRole` reads the principal to
  answer at all, so `displayName` and the rest are already in hand. Paying nothing for them is what lets
  the panel stand alone: it can tell a deleted role from one the list has not reached, and it keeps
  working when a section starts paging. A shared `roleFields` object spread into both types keeps the
  field list written once — lib-graphql's builder has no inheritance.
- **`role(key)` and `group(key)` guard the key three ways**, as `getUser` does: a pattern, a `type` check
  and a `catch`. Without the first two, `getPrincipal` would happily serve a group's members as a role's;
  without the third, an id `ID_VALIDATOR` rejects throws instead of answering null.
- **Null means the key names nothing**, which is an answer, not a failure — so these travel on
  `requestGraphQlDocument`, where a null field passes through.

Client side, the machinery that made this affordable is now `shared/detail`'s `createDetailLoader`: one
request in flight, a 250 ms debounce in front of it, a 50-key cache behind it that evicts the oldest
entry, and `forget` / `invalidate` for leaving a section and for `Refresh`. It was lifted out of the Users
panel with its behaviour intact — that panel's existing suite is the proof — and Roles and Groups are
20-line wrappers over it supplying only their own read.
`entities/application/model/application-info.store.ts` is a fourth instance of the same per-key cache and
the obvious next caller.

One thing did change in the lift. `invalidate` used to re-read the key of the item **on screen**, which
during a load is still the previous item: a `Refresh` landing between two selections loaded the row the
user had just left and cancelled the read of the one they were on, leaving the panel describing a row the
route no longer pointed at. The loader now tracks the selected key separately, which also makes `Refresh`
retry a selection whose load failed.

Type names are global to a schema and lib-graphql only rejects a duplicate when the schema is
assembled, i.e. at module load, so one clash 500s every query rather than the new one. The `idProviders`
root field forced `applicationInfo`'s own `IdProvider` to become `ApplicationIdProvider`, and the
`lib-graphql` double in `src/test/mocks/` now throws on a repeat name so any schema test is the check.

#### Writes ([#57](https://github.com/enonic/app-settings/issues/57))

`deletePrincipals(keys)` is the Mutation root's first field and the one three sections share — a user, a
group and a role are all deleted by handing `deletePrincipal` a principal key. It is also the shape the
mutations after it follow:

- **A batch answers per key, not as one verdict.** `PrincipalDeletion` is `{ key, deleted, reason }`, and a
  refused key is data rather than a field error. It has to be: lib-graphql drops the error `path`, so a
  batch reporting refusals as errors could say only that something went wrong, never which key it was.
  `reason` is what the client renders — an unexplained refusal is the one outcome an administrator cannot
  act on.
- **`deletePrincipal` distinguishes its failures by how it fails.** `DeletePrincipalHandler` swallows
  `PrincipalNotFoundException` into `false`, so `false` means nothing answers to the key; a key
  `PrincipalKey.from` will not parse throws, and so do `su`, `anonymous` and `role:system.admin`, which it
  refuses outright. The source catches per key, so one bad key does not cost the others their outcome.
- **No server-side guard on system principals**, deliberately: the UI's `isReservedRole` / `isSystemUser`
  refusals stay as they are, and making the platform's refusal an enforced rule of ours is #42 D1.
- **Client side**: `api/principal-deletion.api.ts` sends the whole document with variables on
  `requestGraphQlDocument` — a root and a selection cannot express a mutation — and one request carries
  every key, since requests into this app are serialized. `model/principal-commands.ts` owns the policy:
  `notifyError` per refused key, untick what is gone, close the details route if it was showing one of
  them, and reload the list. It reloads even when every key was refused, because `deleted: false` also
  covers a row someone else already deleted.
- **The section lends the command what is not a domain's**: its loader, its `closeItem`, its active key and
  its selection store. The same split `useBrowseSection` already makes for navigation — the router types a
  route's params against its own literal path, and a screen reading several domains keeps its loader on the
  page — so the policy is written once and the calls stay where they belong.

The rest of this section is unchanged:

- Bring `lib/auth/**` (19 files) + `KidGeneratorHandler`, package renamed to `com.enonic.xp.app.settings`.
  Bring their `src/test/resources/**/*-test.js` fixtures — they pin the `PropertyTree` wire format and
  nothing else does.
- The JS wrapper is `lib/idprovider.ts`, **not** `lib/auth.ts` — that name is the `adminOnly` guard.
- Do **not** bring: the 31 JAX-RS/`json/` files (they exist only for lib-admin-ui's loaders and combo
  boxes, which die with it), or `GraphQLSchemaSynchronizer` (a 10-line `synchronized` shim guarding an
  XP 6.13-era race).
- `apis/graphql/principal/` — port the resolvers already running on `/lib/xp/auth` and `/lib/xp/node`;
  rewrite the string-concatenated node queries as structured ones while porting, since the current ones
  interpolate user input into a fulltext expression with no escaping.
- `build.gradle`: `include xplibs.node`, `include xplibs.repo` (use `repo.list()`/`repo.get()` rather
  than app-users' `_parentPath="/repository"` node query — it also fixes the hard-coded
  `['draft','master']` branch list in `report/Repository.ts`).
- Deliberate behaviour changes, not faithful ports: `addMembers`/`removeMembers` currently swallow errors
  and return success; `updatePwd` returns `false` with the reason logged server-side only.
- `apis/permissionReport` is a CSV file download, so it stays a non-GraphQL endpoint. Treat it as a
  rewrite, not a port: today it is `count: -1` over every `/content*` node with a per-node `get()`,
  buffered whole into memory via `java.io.File` + Guava. Its `allow:` is admin-only while app-users'
  GraphQL is not — keep that asymmetry.

**Done when** all five sections read through one GraphQL endpoint and neither replaced app has behaviour
this app cannot produce.

### Phase 4 — improving and refactoring

Deferred on purpose: each one is cheaper to do once both domains are on the schema and the real access
patterns are visible. None of them blocks Phase 3.

- **Batching.** No dataloader exists. Per-request memoization via `execute`'s `context` arg is the only
  lever, and it has to be designed in rather than retrofitted — resolvers that call a source function
  directly are invasive to change later. Irrelevant for ~50 applications; material for
  `principalsConnection { permissions { principal } }`, which is one `getPrincipal` per ACE per row.
  Sketch it at the start of Phase 3 even if it lands here.
- ~~**A thin list query for Roles and Groups.**~~ **Done** ([#40](https://github.com/enonic/app-settings/issues/40))
  — see _Member lists on demand_ below.
- **Connections and cursors.** app-users hand-rolls offset-int cursors; `/lib/graphql-connection` ships
  base64 ones. For a few hundred principals, plain `start`/`count`/`total` may be enough. Decide with
  batching — the two share a shape.
- **Market call placement.** Currently a browser `fetch` to `market.enonic.com/api/graphql`, which forces
  a hand-rolled CSP built from `substring(0, indexOf('/', 9))` and has three divergent version
  comparators. Moving it behind the schema collapses all of that, at the cost of an outbound HTTP call
  from XP. This is also the last Applications data gap — "available version".
- **Extraction to a shared library.** Request plumbing, formatting helpers and parts of this API surface
  are the same problem Content Studio v6 solves separately (`CLAUDE.md`). Keep anything written here
  portable in the meantime — no reaching into this app's config, stores or i18n keys beyond what props
  carry — and name candidates in review.
- **Upstreaming the eight beans.** Explicitly out of scope (decision 5), but the bodies are close to what
  XP lib handlers would be. Now worth revisiting, since Phase 2 shipped them all.

## Pending

Two open questions, neither of which is a phase:

1. **`idProviderConfig` modelling.** Today it crosses GraphQL as a `JSON.stringify`'d `PropertyTree` with
   a hand-rolled `{name, type, values}` codec, and the typing fidelity is load-bearing — a null `Long`
   serializes to `{}`, a null `Reference` is dropped entirely. Options: keep `String` + `JSON.parse`, use
   lib-graphql's unused `Json` scalar, or model it properly. Bringing the 19 Java files means the codec
   survives either way, so this is a schema-design choice, not a blocker. Decide during Phase 3.
2. **Stopped applications.** Every `applicationInfo` list resolves through `ResourceService`, so it is
   unknown whether a stopped-but-installed app still reports its descriptors or answers empty. If it
   answers empty, the panel needs an unavailable state distinct from "ships none" — one field cannot
   express both. Check by stopping an app and re-running the query; it costs one minute and decides a
   piece of the details panel.

## Reference

- `../app-applications/src/main/java/**` — the four GET endpoints and the field lists they produce. Read
  for _what data the panel needs_, never for structure.
- `../app-users/src/main/resources/apis/graphql/**` — the working GraphQL setup. Read for resolver shape;
  ignore its folder layout and its client.
- `../app-users/src/main/java/com/enonic/xp/app/users/lib/auth/**` — the 19 files Phase 3 brings.
- `../xp/modules/lib/**` — the JS libs. `lib-app`, `lib-schema`, `lib-content`, `lib-auth` matter here.
- `../app-contentstudio` has **no GraphQL at all** — its server API is typed JSON REST. Its
  `v6/shared/api/client.ts` is this repo's `shared/api/client.ts` ancestor and stays the model for the
  client half, but it is not a reference for the API layer.
