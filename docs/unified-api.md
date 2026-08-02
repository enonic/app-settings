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
   rewriting all 43 or stringify-then-`JSON.parse`. Most of what it does is now free (see _Forms_).
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

All checked against the local XP checkout at `../xp` (`8.1.0-SNAPSHOT`). These are load-bearing —
re-verify before contradicting one, don't re-derive it.

### `lib-schema` reaches static descriptors in a normal app jar

The obvious reading — "dynamic/virtual apps only, so it can't see a compiled jar" — is **wrong**:

```
DynamicSchemaServiceImpl.listComponents (:211)
  → DynamicResourceManager.listResources
  → resourceService.findFiles(appKey, "cms/parts/.+/.+\.yaml")   ← ResourceService, not NodeService
  → ResourceServiceImpl.findApplicationUrlResolver               ← resourceSource attribute is null
  → ApplicationFactoryServiceImpl.findResolver(key, null) (:94)  ← ACTIVE bundle wins
```

`VirtualAppContext.createContext()` sets only `repositoryId`/`branch`, never `resourceSource`, so the
app's own bundle resolves. And the node paths `createComponentRootPath` builds (`/<appKey>/cms/parts`,
stripped to `cms/parts`) are exactly where XP 8 puts static descriptors:

```java
PartDescriptor.java:24         ResourceKey.from( key.getApplicationKey(), "cms/parts/" + key.getName() )
ContentTypeLoader.java:18      super( resourceService, "/cms/content-types" );
MixinDescriptorLoader.java:18  super( resourceService, "/cms/mixins" );
CmsFormFragmentLoader.java:18  super( resourceService, "/cms/form-fragments" );
```

Requires `ADMIN` or `SCHEMA_ADMIN` (`DynamicSchemaServiceImpl.requireAdminRole`, `:425`) — this tool is
admin-only, so that is free.

**Confirmed live.** `applicationInfo(key) { contentTypes { name } parts { name } }` against an installed
Content Studio returns its static descriptors. The whole Site section is reachable with no Java.

### Forms come back typed, already deserialized

`lib-schema` returns `form: FormItem[]` from `@enonic-types/core`:

```ts
export type FormItem = FormItemSet | FormItemLayout | FormItemOptionSet | FormItemInput | FormItemFormFragment;
export interface FormItemInput {
  formItemType: 'Input'; name: string; label: string; helpText: string;
  inputType: InputType; occurrences: { maximum: number; minimum: number };
  default: { value: string; type: ValueType }; config: Record<string, ...>;
}
```

That is app-applications' whole `FormJson`/`InputJson`/`FormItemSetJson`/`FormOptionSetJson`/
`OccurrencesJson`/`PropertyValueJson` tree, handed over by the platform. No section renders a form, so
no form mapper was ever written — but **any Java one must emit this exact shape**, so the schema never
grows a second form type.

### `@enonic-types` lies about nullability — a null field is _absent_, not null

The most expensive hour so far went here, so it is worth stating flatly: **a text field an XP lib
declares as non-null `string` may not arrive at all.**

```java
// ScriptMapGenerator.putInMap — the key is dropped entirely, not set to null
protected void putInMap( final Object map, final String key, final Object value ) {
    if ( value != null ) {
        NashornHelper.addToNativeObject( map, key, value );
    }
}
```

Both `SchemaMapper` and `DescriptorMapper` in lib-schema write `title` and `description` straight from
nullable Java getters, so a part with no title reaches JS with no `title` property — while
`@enonic-types/lib-schema` types it `title: string`. `value.length` on it throws
`TypeError: Cannot read property 'length' of undefined`, surfacing as a GraphQL `DataFetchingException`
wrapped in a `ResourceProblemException`.

**Rule for every `*.source.ts`: treat text read from an XP lib as absent-capable regardless of its
declared type**, and comment the guard — against the declared type a null check looks redundant and
invites deletion. `application-info.source.ts` has `nonEmpty()` and `MaybeText` for this. Fields only
passed through (never measured or indexed) are safe either way.

### Lifecycle is core's, and `mount=management` is a non-issue

```java
// ApplicationApiHandler.java:40
@Component(property = {"key=server:app", "title=Applications API",
                       "mount=management", "allowedPrincipals=role:system.admin"})
// POST /install /installUrl /start /stop /uninstall  ·  GET /events (SSE)
```

`mount` is only checked for bare `/api/` connector requests. For an admin tool the check is
`adminToolDescriptor.getApiMounts().contains(descriptorKey)` (`SlashApiHandler.java:228`) — listing
`server:app` under `apis:` in `main.yaml` is what authorizes it.

Request shapes: `installUrl` takes `{"URL": "...", "sha512": "..."}`; `start`/`stop`/`uninstall` take
`{"key": ["..."]}` (single value accepted); `install` is multipart, field name `file`.

### Our existing websocket already carries application events

`server:app/events` SSE is **redundant for us**. `admin:event` forwards _every_ event unfiltered
(`EventApiHandler.onEvent` → `sendToGroup`), and XP publishes app lifecycle as
`EVENT_TYPE = "application"` with `eventType ∈ { INSTALLED, STARTED, STOPPED, UNINSTALLED }`
(`ApplicationEvents.java`) — which is what `shared/server-events/server-events.ts` already filters on.

### Coverage: what JS can and cannot reach

| Data                                                                    | Source                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| key, version, min/max system version, state, `modifiedTime`, system     | `lib-app.get` / `.list`                                                |
| title, description, vendor, url                                         | `lib-app.getDescriptor`                                                |
| pages, parts, layouts, content types, mixins, form fragments, site form | `lib-schema`                                                           |
| id providers _using_ an app                                             | `lib-auth.getIdProviders`, filter on `idProviderConfig.applicationKey` |
| install / start / stop / uninstall                                      | `server:app`                                                           |
| lifecycle events                                                        | existing `admin:event` websocket                                       |
| available version                                                       | Market GraphQL                                                         |
| icon                                                                    | ✅ Java — our `/lib/icon`; base64, because GraalJS cannot serve bytes  |
| task descriptors                                                        | ✅ Java — our `/lib/task`; `taskLib.list()` is _running_ instances     |
| admin tools                                                             | ✅ Java — our `/lib/admin-tool`; the url comes from `lib-admin`        |
| admin extensions / widgets                                              | ✅ Java — our `/lib/admin-extension`                                   |
| macros                                                                  | ✅ Java — our `/lib/macro`; no `lib-macro` exists                      |
| api descriptors                                                         | ✅ Java — our `/lib/api`                                               |
| id-provider descriptor (mode + config form)                             | ✅ Java — our `/lib/idprovider`; `IdProviderDescriptorService`         |
| webapp deployment url                                                   | ✅ Java — our `/lib/webapp`; JS cannot read another app's resources    |

Grepped all 25 XP libs for all 13 descriptor services: only `lib-content` (ContentTypeService,
MixinService, CmsService) and `lib-schema` (DynamicSchemaService) reference any. The
parse-the-YAML-ourselves escape hatch is closed — `ResourceKey.resolve()` never changes the app key
(`ResourceKey.java:62`), so `io.getResource()` cannot read another app's files.

`modifiedTime` is the only install-date XP has. There is no separate `installedTime` anywhere.

### GraalJS serves no bytes, and gives an app one JS thread

`build.gradle` pins `scriptEngine = 'GraalJS'`. Two consequences, both found the hard way building the
icon endpoint, and both applying to **any** app-owned api here.

**A response body cannot be a Java object.** `PortalResponseSerializer.populateBody` asks
`ScriptValue.isObject()` before `getValue()`, and `GraalScriptValueFactory.newValue` wraps every host
object in `GraalObjectScriptValue`, whose `isObject()` is hardcoded `true`
(`GraalObjectScriptValue.java:31`) — so a `ByteSource` body reaches the serializer as
`GraalObjectConverter.toMap` of the host object, a map of its own method names, and is JSON-stringified.
Nashorn sent any non-`JSObject` to `ScalarScriptValue` and streamed the real thing, which is why XP's own
documented idiom (`lib-content/.../examples/content/getType.js:104`, `body: icon.data`) works only on the
engine XP is leaving. A string body is no escape for images either: `ResponseSerializer:105` re-encodes
with `Charset.forName(response.getCharacterEncoding())` and Jetty assigns no encoding to a mime type it
treats as binary, so `image/*` dies on `IllegalArgumentException: Null charset name` even with
`; charset=` spelled out. **Binary has to be encoded in Java and travel as a string.** A `Map` under
`application/json` — what the GraphQL controller returns — is fine.

**One single-threaded JS context per application.** `GraalJSContextFactory.create()` builds one `Context`
per app (`ScriptRuntimeFactoryImpl.java:173`). XP guards the entry points it owns with
`synchronized(context)` (`GraalScriptExports.executeMethod:56`), so overlapping requests usually just
serialize — but where a raw polyglot value escapes that monitor
(`GraalObjectScriptValue.getValue:78`, `GraalObjectConverter.toObject`) one dies on
`IllegalStateException: Multi threaded access requested by thread …`. Measured: ~12 parallel `<img>`
requests to an app-owned api produced 4 such failures. `shared/api/graphql.ts` holds a single-flight
queue, so the throwing path is unreachable — but that buys no speed: the app's JS is serial either way,
and a slow query holds the lock against every other request into this app, the tool's own page
controller included. **Batching root fields into one document is the only way to make a screen cheaper.**

### `lib-graphql` constraints

- **No `@enonic-types/lib-graphql` exists, at any version.** Hand-write
  `src/main/resources/types/graphql.d.ts` and add a `paths` entry — the pattern `mustache.d.ts`
  already establishes. The jar is stuck at `3.0.0`.
- **No dataloader, no batching primitive.** `execute(schema, query, variables, context)` — the
  `context` arg is the only per-request memoization hook, and app-users never uses it.
  `GraphQL.newGraphQL(schema).build()` runs per request inside the lib.
- Type builders come from a generator that **must be a module singleton**: object types created by two
  different generators cannot be composed.
- `graphQl.reference('TypeName')` is the only way to express a circular reference.
- Errors: `{ errorType, message, locations, validationErrorType?, exception: { name, message } }`,
  always HTTP 200.

### Pin every `@enonic-types` dependency

npm's `latest` tag is **7.16.7** for all of them even though 8.0.3 exists. Unpinned means 7.x types
(where `lib-schema` still has `XDATA`, and `displayName` instead of `title`) against an 8.x runtime.

The types also lag the runtime, and this app builds against 8.1.0-SNAPSHOT. `lib-auth` is the case:
`getIdProviders()` and `createIdProvider()` exist in the 8.1 lib but are declared in no stable types
release, so `@enonic-types/lib-auth` is pinned to **`8.0.4-B1`** — exact, no caret, because it is a
prerelease. **Read the lib's own `.ts` in `../xp/modules/lib/`, not `node_modules`, before concluding a
function does not exist.** Doing the reverse produced a wrong "this needs Java" call once already.

### Adding Java to this repo is nearly free

`com.enonic.xp.app` already applies both `JavaPlugin` and `BndBuilderPlugin`, so `src/main/java`
compiles and bnd derives `Import-Package` with no extra plugin and no manifest work. All it took:

- `implementation xplibs.api.script` — `ScriptBean` and `MapSerializable` live in `script-api`, not
  `core-api`. Most descriptor services (`com.enonic.xp.macro`, `.task`, `.api`) are in `core-api`, which
  was already declared; `xplibs.api.admin` was added for the two admin-descriptor services.
- `java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }`. Without it the build inherits
  whatever JDK runs Gradle; 25 is what XP builds with (`xp/gradle/java.gradle:40`).
- Nothing in CI — the workflow already sets up temurin 25 and runs `./gradlew build`.

Two consequences: `pnpm check` no longer covers the whole server, so `./gradlew compileJava` is the fast
check for a bean; and IDE Java support shadow-compiles the whole resources tree into `bin/`, which is
gitignored and excluded from `lint`/`fmt` — without that, oxlint type-checks the copy and reports every
error twice.

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
      query.ts                       root fields, one entry per domain
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

No `mutation.ts` yet: GraphQL forbids an object type with no fields, so the Mutation root arrives with
the first lifecycle mutation rather than shipping empty.

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
export function requestGraphQl<T>(
  query: string,
  variables?: object,
  signal?: AbortSignal,
): ResultAsync<T, AppError>;
```

It posts the standard `{ query, variables }` envelope, maps a non-empty `errors[]` to an `AppError` so
failures stay values, and serializes calls through a single-flight queue (see _GraalJS_). "Do not add a
second http helper" is respected: one transport, one error type, one front door.

The endpoint url is **not** a parameter. It comes from the `$config` fact store in
`shared/config/config.store.ts`, set once at bootstrap in `main.ts` exactly as `setPhrases` populates
`$phrases`. An api file cannot receive props, and `.get()` outside a component is fine
(`.claude/rules/stores.md`) — this keeps url plumbing out of every api file while still honouring "urls
come from the tool config, never hardcoded".

**One operation per request.** `GraphQLHandler.execute` builds its `ExecutionInput` from `query`,
`context` and `variables` only — **`operationName` is ignored**, so a document holding several named
operations silently runs the wrong one rather than failing. `requestGraphQl` therefore does not send the
field; keep one operation per document and the constraint never bites.

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

Query text, wire type, mapper and the `requestGraphQl` call all live in the same
`api/<subdomain>.api.ts`. A query string is a wire concern, so it never leaves the api segment.

```ts
// Shared between list rows and the detail header — compose, don't duplicate the field list.
const APPLICATION_ROW = `
  fragment ApplicationRow on Application {
    key
    displayName
    version
    state
  }
`;

const APPLICATIONS_QUERY = `
  ${APPLICATION_ROW}
  query Applications {
    applications {
      ...ApplicationRow
    }
  }
`;

type ApplicationsResult = { applications: ApplicationRowDto[] };

export function fetchApplications(signal?: AbortSignal): ResultAsync<Application[], AppError> {
  return requestGraphQl<ApplicationsResult>(APPLICATIONS_QUERY, undefined, signal).map(
    ({ applications }) => applications.map(toApplication),
  );
}
```

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
- **Name every operation** (`query Applications`). The server ignores the name, but it shows up in
  Altair history and error messages. Fragments are not operations, so composing them keeps the
  one-operation-per-document rule intact.
- **Variables, never interpolation.** `query Application($key: String!)` with `{ key }` passed as
  variables — never `${key}` inside the query text.
- **Two queries per domain, not one.** A thin list query and a fat detail query. This is the actual gain
  over the REST version, where `/application/list` returned all 19 fields per app — config forms
  included — for a list that renders four of them.
- **The wire type mirrors the selection set exactly**, named `<Operation>Result`, `type` not `interface`.
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
  revived while the app runs on GraalJS (see _GraalJS_), so `lib/icon` base64-encodes on the Java side.
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

### Phase 3 — app-users on GraphQL

The base exists, so this is mostly moving known-good code.

- Bring `lib/auth/**` (19 files) + `KidGeneratorHandler`, package renamed to `com.enonic.app.settings`.
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
