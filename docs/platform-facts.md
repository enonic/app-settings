# XP platform facts

What Enonic XP actually does, as opposed to what its types and documentation say it does. Everything
here was checked against the local XP checkout at `../xp` (`8.1.0-SNAPSHOT`) by reading the
implementation, and most of it was learned the expensive way.

**These are load-bearing. Re-verify before contradicting one; do not re-derive one.** Each entry
names the class and, where it matters, the line — so checking a claim against a newer XP is reading
one file, not repeating the investigation.

This file outlives any single issue. `docs/unified-api.md` holds the plan and the decisions that
follow from these facts; when a phase there is finished the plan ages, but nothing here does until XP
itself changes.

## `lib-schema` reaches static descriptors in a normal app jar

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

## Forms come back typed, already deserialized

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

## `@enonic-types` lies about nullability — a null field is _absent_, not null

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

## Lifecycle is core's, and `mount=management` does not block us — but is not a foundation

```java
// ApplicationApiHandler.java:40
@Component(property = {"key=server:app", "title=Applications API",
                       "mount=management", "allowedPrincipals=role:system.admin"})
// POST /install /installUrl /start /stop /uninstall  ·  GET /events (SSE)
```

`mount` is only checked for bare `/api/` connector requests. `SlashApiHandler.verifyRequestMounted`
switches on the mount context, and the `ADMIN_TOOL` branch never reads `apiDescriptor.getMount()` at
all — it checks `adminToolDescriptor.getApiMounts().contains(descriptorKey)`. Listing `server:app`
under `apis:` in `main.yaml` is what authorizes it.

**That answers "will the request be blocked", not "may we build on this".** Enonic's own
documentation calls `mount: "management"` experimental, "subject to change without the usual
deprecation cycle", tells you to avoid relying on it for production workloads, and describes the
management endpoint as advanced use for infrastructure integrations rather than regular application
APIs. If XP ever restricts management-mounted APIs to the management connector, the Applications
section loses install, start, stop and uninstall with no deprecation warning. app-applications
already calls `server:app`, but it targets lib-admin-ui and is being replaced, so that is an
inherited dependency rather than a confirmed decision.

The escape hatch, should it be wanted: `ApplicationService` in `core-api` carries
`startApplication`, `stopApplication`, `uninstallApplication`, `installGlobalApplication(ByteSource)`
and `isLocalApplication` — everything `server:app` does except `installUrl`, whose download and
sha512 check live in `ApplicationApiHandler` itself. A bean over it follows the pattern of the eight
already here and drops the experimental dependency entirely. Nothing in this repo calls `server:app`
yet, so the choice is still free.

Request shapes: `installUrl` takes `{"URL": "...", "sha512": "..."}`; `start`/`stop`/`uninstall` take
`{"key": ["..."]}` (single value accepted); `install` is multipart, field name `file`.

## `local` is the deploy directory, and `system` is independent of it

The two application flags read as if one implied the other — a system application feels like something
the server holds locally — and they are unrelated:

- **`local` means "arrived through `$XP_HOME/deploy`", and nothing else.**
  `ApplicationServiceImpl.isLocalApplication` (`:117`) is membership of `localApplicationSet`, which
  only `doInstallLocalApplication` (`:385`) fills, and the one non-test caller of the
  `installLocalApplication` above it is `DeployDirectoryWatcher:126`. An application installed through
  `server:app` or from the market is therefore never local.
- **`system` is the bundle header.** `ApplicationBundleUtils.isSystemApplication` (`:42`) tests
  `X-Bundle-Type: system`, set at build time — in the XP tree only `modules/app/app-system` sets it,
  and none of the admin applications being folded into this app do.

So the distribution's own applications are `system` and **not** `local`, while a system-flagged jar
dropped into `deploy/` is both — `ApplicationServiceSystemAppGuardsTest` covers exactly that pairing.
Neither flag can be derived from the other, and `isUninstallable` in `application-lifecycle.ts` refuses
on each separately for that reason.

## Application lifecycle and install progress ride the admin events hub, on a topic each

XP publishes app lifecycle as `EVENT_TYPE = "application"` with
`eventType ∈ { INSTALLED, STARTED, STOPPED, UNINSTALLED }` (`ApplicationEvents.java`); the hub's
server listener republishes it on the `applications` topic (`lib/events/applications.ts`). The legacy
`admin:event` socket still exists in XP but forwards _every_ event unfiltered
(`EventApiHandler.onEvent` → `sendToGroup`) and is no longer mounted on the tool.

Per-percent install progress **is** an `application` event too — `ApplicationLoader.progress()`
publishes `eventType: "PROGRESS"` with `applicationUrl` and `progress` onto the ordinary event bus
— and that bus is its _only_ route toward a browser: `server:app`'s `GET /events` SSE stream does
**not** carry it (`ApplicationApiHandler.onEvent` reacts solely to `application.cluster`
lifecycle events — `installed`/`state`/`uninstalled`). The hub republishes it on its own
`application-progress` topic as `{url, percent}`, keyed by the download url because the event
carries no application key; why it is not a row on `applications` is in `extensions/docs.md`.

**Progress is node-local at both ends, and nothing makes it otherwise.** The core event is
`distributed(false)`, and `AdminEventHubImpl` "delivers to the sockets on this node and does not
distribute over the cluster". So a clustered instance shows a download only to a browser whose
websocket happens to sit on the node that served the `installUrl` request — the same limitation the
legacy `admin:event` socket had. Lifecycle events are unaffected: those XP distributes.

## Coverage: what JS can and cannot reach

| Data                                                                    | Source                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| key, version, min/max system version, state, `modifiedTime`, system     | `lib-app.get` / `.list`                                                |
| title, description, vendor, url                                         | `lib-app.getDescriptor`                                                |
| pages, parts, layouts, content types, mixins, form fragments, site form | `lib-schema`                                                           |
| id providers _using_ an app                                             | `lib-auth.getIdProviders`, filter on `idProviderConfig.applicationKey` |
| install / start / stop / uninstall                                      | `server:app`                                                           |
| lifecycle events                                                        | the hub's `applications` topic (`HUB_TOPICS`, `admin:events`)          |
| available version                                                       | Market GraphQL                                                         |
| icon                                                                    | ✅ Java — our `/lib/icon`; base64, because GraalJS cannot serve bytes  |
| task descriptors                                                        | ✅ Java — our `/lib/task`; `taskLib.list()` is _running_ instances     |
| admin tools                                                             | ✅ Java — our `/lib/admin-tool`; the url comes from `lib-admin`        |
| admin extensions / widgets                                              | ✅ Java — our `/lib/admin-extension`                                   |
| macros                                                                  | ✅ Java — our `/lib/macro`; no `lib-macro` exists                      |
| api descriptors                                                         | ✅ Java — our `/lib/api`                                               |
| id-provider descriptor (mode + config form)                             | ✅ Java — our `/lib/idprovider`; `IdProviderDescriptorService`         |
| id provider read-one, update, delete, permissions                       | ✅ Java — our `/lib/idprovider`; `lib-auth` has only list + create     |
| webapp deployment url                                                   | ✅ Java — our `/lib/webapp`; JS cannot read another app's resources    |

Grepped all 25 XP libs for all 13 `*DescriptorService` interfaces. **One is reachable:**
`lib-app` uses `ApplicationDescriptorService` in `GetApplicationDescriptorHandler`, which is what
`getDescriptor` is. The other twelve are referenced by no lib at all. Separately, `lib-content` uses
ContentTypeService, MixinService and CmsService, and `lib-schema` uses DynamicSchemaService — those
four are not `*DescriptorService` types and are not part of the thirteen.

That one hit is why `/lib/icon` is a different case from the other seven beans: the binding exists
and `application.source.ts` already uses it. It is Java because GraalJS cannot put bytes on the wire
(see _GraalJS_), not because nothing else can reach the descriptor. **Decision 2 therefore has a
second clause: Java is also warranted where the engine will not carry the type.**

The parse-the-YAML-ourselves escape hatch is closed — `ResourceKey.resolve()` never changes the app
key (`ResourceKey.java:62`), so `io.getResource()` cannot read another app's files.

`modifiedTime` is the only install-date XP has. There is no separate `installedTime` anywhere.

## A principal's `modifiedTime` never arrives, however it is read

Not a nullability question — the field is unreachable. **The API surface all the way down means to carry
it**: `Principal` stores it, its builder accepts it, `PrincipalMapper` serializes it, and
`@enonic-types/core` declares it required on `Role` and `Group`. Nothing fills it. The read side is the
visible half — `PrincipalNodeTranslator` builds every principal without it:

```java
// PrincipalNodeTranslator.createRoleFromNode — same shape for the group and user branches
return Role.create().
    key( PrincipalKeyNodeTranslator.toKey( node ) ).
    displayName( nodeAsTree.getString( DISPLAY_NAME_KEY ) ).
    description( nodeAsTree.getString( DESCRIPTION_KEY ) ).
    build();                                    // ← no .modifiedTime( … )
```

The translator is what every read goes through — `findPrincipals`, `getPrincipal`, `getMembers` — so no
read path has it.

**The write side is broken too, which is the part that makes this more than a missing line.**
`doCreateUser` (`SecurityServiceImpl:440`), `createGroup` (`:567`) and `createRole` (`:624`) each build a
principal with `Millis.now()` and then **return the translator's object instead**
(`PrincipalNodeTranslator.userFromNode( node )`, `:455`) — so the value does not survive even the call
that sets it. And nothing persists it: `PrincipalPropertyNames` has no modified-time key at all, and
`toCreateNodeParams` (`:88-110`) never writes one. The only timestamp that exists is node metadata,
`Node.timestamp()` (`Node.java:114`), which means the last write to the node in that branch — related,
but not the same thing as a principal's own modified time.

**Reads as a defect; unconfirmed upstream.** Every layer of the API promises the field and no layer fills
it, which is hard to read as intentional — but there is no upstream issue, test or comment either way, and
fixing it properly means deciding whether the answer is node metadata or a genuinely persisted field. So:
not a shape to design around, and not something to assert as settled.

The field stays wired here on that reading: `role.types.ts` exposes it, `ROLES_SELECTION` selects it,
`Role` in `principal.types.ts` overrides it to optional, and `RoleDetails` drops the row rather than
showing a blank. Until XP changes, that row never renders — the intended behaviour of an optional field,
not dead code, though also not something to build a column on. `Group` deliberately does not expose it;
nothing in its panel would show it.

Reaching it today means going around lib-auth to the node in `system-repo`, which is a bean, not a fix.

## Ordering a principal query: only `_path` gives a total order

`findUsers` takes a sort expression, and a partial order makes `start`/`count` paging unsound — two rows
sharing the sort value can swap between requests, so one appears on two pages and another on none. The
obvious tie-break candidates both fail, and neither failure is loud:

- **`principalKey` is declared but never written.** `PrincipalIndexConfigFactory:19` gives it
  `IndexConfig.MINIMAL`, which reads as "indexed" — but `PrincipalNodeTranslator.toCreateNodeParams`
  stores only `displayName`, `principalType`, `userStoreKey` and the type-specific fields.
  `IndexItemFactory.createItems` writes index items **per property present**, so a config for an absent
  property produces nothing. `SortQueryBuilderFactory` then sets `unmappedType`, so sorting by it is
  silently ignored rather than an error. **Index config is not evidence that a property exists.**
- **`_name` is written and orderable but not unique.** `NodeStoreDocumentFactory:113` indexes it
  `IndexConfig.FULLTEXT`; the node name is the principal's name, unique only within its provider, so two
  providers each holding an `alice` leave the order partial.
- **`_path` is written `IndexConfig.PATH` and is unique repo-wide** — `PrincipalKey.toPath` builds
  `/identity/<provider>/users/<id>`, with the type folder in the middle — which
  is what makes `displayName ASC, _path ASC` a total order.

Ordering by a string is case-insensitive for free: `OrderByValueResolver.getOrderbyValueForString`
lowercases what it writes to `_orderby`, truncating at 1024 characters.

## Paging stops at the result window

Elasticsearch refuses a query whose `from + size` passes `index.max_result_window` — 10 000 by default,
and XP's `search-settings.json` carries only shards, replicas and analysis, so the default stands. The
`QueryPhaseExecutionException` is **not** caught by `SecurityServiceImpl.query`, which catches only
`NodeNotFoundException`, so the field errors and the screen blanks rather than the paging ending. Clamp
the offset server-side; 200 `Load more` clicks reach it.

## `getMemberships` is direct-only unless asked

`getMemberships(key)` leaves `transitive` at `false` (`GetMembershipsHandler:31`), which means
`queryDirectMemberships` — a plain `member = <key>` filter. The transitive walk is `getAllMemberships`,
reachable only with the second argument `true`. It matters for any "what does this user have" screen: an
administrator is normally an administrator _through_ `system:administrators`, so a direct-only read shows
no roles at all. `getAllMemberships` returns groups as well, so filtering by type still works.

## Six membership edges the platform refuses, and both writes are idempotent

`addMembers` and `removeMembers` both build a `PrincipalRelationship` and hand it to
`SecurityServiceImpl`, so every write of a member or a membership passes the same four constructor
checks (`PrincipalRelationship:18-26`) plus two service-level ones. What they reject is not visible from
the JS signatures and none of it is documented:

- **A principal cannot be related to itself.** `'from' and 'to' cannot refer to the same principal` — so a
  group offered as its own member is a save that cannot succeed, which is why the members picker excludes
  the group being edited. app-users excludes it the same way.
- **`role:system.everyone` and `role:system.authenticated` can hold nobody.**
  `FORBIDDEN_FROM_RELATIONSHIP` (`SecurityServiceImpl:96`) rejects every relationship _from_ either, yet
  `SecurityInitializer:76-77` creates both as ordinary role principals, so they come back from `roles`
  like any other and a picker will happily offer them. `IMPLICIT_ROLE_KEYS` in `principal.keys.ts` is
  that list.
- **Role to role, group to role, and anything from a user** are refused as well. Only the second is worth
  remembering: a group's roles are written by adding the group to each role, never the other way round.
- **`su` cannot be removed from `role:system.admin`.** `removeRelationship` refuses it outright
  (`SecurityServiceImpl:179-182`), so the refusal `role.source.ts` makes is now a better message rather
  than the only guard — app-users predates the platform check. Verified against the 8.1.0-SNAPSHOT
  checkout; the app-users comment claiming the platform allows it is stale.

**Both writes are idempotent, and that is load-bearing** — it is what lets a mutation apply a change list
without reading current membership first. `PrincipalNodeTranslator:145-166` checks whether the key is
already in `MEMBER_KEY` before adding it, and `:168-187` rebuilds the list without the key, so removing one
that is not there is a no-op. Re-applying a change somebody else already made costs nothing and cannot
duplicate.

**Nothing checks that the principal being added exists.** `addRelationshipToUpdateNodeParams` writes a
string into the container's node and never reads the target, so a dangling member key is accepted silently.
Catching it means a `getPrincipal` per added key — affordable for a change list, not for a whole one.

## A password cannot be set while a user is created, and whitespace in one is dropped

Two separate traps, both in the JS binding rather than in the platform:

- **`CreateUserParams` carries a password and `SecurityServiceImpl.doCreateUser:449-452` applies it, but
  `CreateUserHandler` never sets one** — it builds the params from `displayName`, `email`, `login` and
  `userKey` and nothing else. So from JS a user is always created first and given a password after, and a
  password that fails leaves a user who has none. The capability exists in core; only the binding is
  short. app-users has the same two-step and the same hole.
- **`ChangePasswordHandler.normalize` does `value.replaceAll("\\s", "")`** — every whitespace character,
  not a trim. A typed `pass word 1A!` is stored as `password1A!`, so the password an administrator was
  shown is not the one that works. `setPassword` with a null password stores no hash at all, which is how
  a password is cleared.

## `modifyUser` writes two fields and ignores the rest

`ModifyUserHandler.updateUser` converts and assigns `displayName` and `email`, and nothing else —
`EditableUser` also carries public `login`, `loginDisabled`, `key`, `modifiedTime` and `profile`, and the
handler reads none of them. Two consequences:

- **A login cannot drift from its key through this lib.** app-users assigns `newUser.login = params.login`
  inside its editor, which is a silent no-op; the divergence its wizard appears to allow does not happen.
- **A user cannot be disabled from JS**, which is the other half of the `disabled` entry below: nothing
  writes the property and nothing would read it back.

Both fields are guarded the same way every `modify*` editor is — see _A `modify*` editor cannot clear a
field by omitting it_.

## Duplicate emails are the platform's business, not ours

`SecurityServiceImpl.createUser:470-484` takes a per-`idProvider|email` lock from a `Striped` pool and
calls `duplicateEmailValidation` inside it; `doUpdateUser` validates again after applying the editor. So
uniqueness is enforced on both writes, scoped per provider, and a rejection arrives as an exception from
the mutation. app-users bolts an advisory `isEmailAvailable` REST endpoint on in front of the wizard for
inline feedback — that endpoint answers a boolean and enforces nothing, and it is not worth porting.

## A `PropertyTree` list of one reads back as the value, not as a list

`PropertyTreeMapper.serializeList` emits a single-valued property as that value rather than as an array of
one, so a profile holding exactly one public key answers `publicKeys: {…}` and a profile holding two
answers `publicKeys: [{…},{…}]`. Every read of a repeatable property has to normalise — app-users runs each
one through `util.forceArray`, and `toPublicKeys` in `user.source.ts` is our equivalent. The declared type
promises an array either way, so nothing but a runtime check catches it.

## A user node stores almost nothing

`populateUserData` writes `email`, `login`, `authenticationHash` and `profile`; the generic part adds
`displayName`, `principalType` and `userStoreKey`. Consequences for any user screen:

- **no `description`** — the property name exists in `PrincipalPropertyNames` but only
  `populateGroupData`/`populateRoleData` write it, and `PrincipalMapper:46` emits it in the non-User branch;
- **no `createdTime`**, and `modifiedTime` never arrives for the reason above;
- **`disabled` is always `false`** — `PrincipalMapper:37` serializes `user.isDisabled()`, but nothing
  persists it and `createUserFromNode` never reads one, so it is the builder default. The `Active`/`Inactive`
  cell the mockups draw has no source.

## A `modify*` editor cannot clear a field by omitting it

`ModifyRoleHandler.updateRole` reads the map the editor returned and assigns each field **only when the
converted value is non-null**:

```java
final String description = Converters.convert( map.get( "description" ), String.class );
if ( description != null ) { target.description = description; }
```

So `undefined` means "leave it alone", not "clear it", and an editor that drops a field silently keeps the
old value. **The empty string is what clears one** — it converts to `""`, which is non-null. `ModifyUserHandler`
and `ModifyGroupHandler` are written the same way, so this holds for every principal edit, and it is invisible
to a unit test that asserts on its own editor rather than on what the platform does with the result. The read
side maps `""` back to absent (`nonEmpty`), so nothing downstream has to know.

## An id provider's config loses its types through `lib/xp/auth`, and four other write quirks

XP 8.1 grew `createIdProvider` and `getIdProviders` in `lib/xp/auth`; everything else about a provider is
still `SecurityService` only. Five things about the write path are not visible from the signatures:

- **`createIdProvider` cannot store a typed config.** `CreateIdProviderHandler` builds the tree with
  `PropertyTree.fromMap( config.getMap() )`, which infers a `ValueType` per JS value — so a `Reference`
  arrives as a `String` and a `GeoPoint` as text. Nothing reports it; the value is simply the wrong type
  when the id provider application reads its own config back. Our `/lib/idprovider` create exists for that
  one reason, with the `{name, type, values}` codec app-users uses.
- **`UpdateIdProviderParams.update` applies a field only when it is non-null** — the same rule the
  `modify*` editors follow, one level up. Without an editor a description cannot be cleared and a provider
  cannot be unbound from its application; with one, the fields are assigned whatever the editor left.
- **`updateIdProvider` answers `null` for a key nothing answers to** (`SecurityServiceImpl:885-891`)
  rather than throwing, so a pre-read to tell "gone" from "failed" buys nothing.
- **Permissions are asserted, never patched, and only when non-null.** `SecurityServiceImpl:899` skips the
  whole permission write for a null list; a list that is present replaces the ACL on the provider node and
  on its `users` and `groups` children, merged with the root permissions. There is no add/remove form.
- **`CreateIdProviderParams` turns a null permission list into an empty one** (`:27-28`), so a provider
  created without permissions is reachable through the inherited root permissions alone — which is not the
  same as the three entries app-users seeds a new provider with.
- **A created provider is not in the list until the index catches up.** `getIdProviders` is
  `nodeService.findByParent` — a search — while `createIdProvider` writes the three nodes with no
  refresh at all (`SecurityServiceImpl:832-890`). So a list re-read straight after a create answers
  without it. The asymmetry is easy to miss: `deleteIdProvider` passes `RefreshMode.ALL` explicitly, and
  `updateIdProvider` refreshes as a side effect of `setNodePermissions` (`:930-934`) — but only when the
  update carried permissions. **A write's own answer is what a list should be patched with**, which is
  what `receiveIdProvider` does.
- **`deleteIdProvider` refuses nothing and takes everything with it.** It is one
  `nodeService.delete( nodePath )` on the provider's path (`SecurityServiceImpl:881-901`), which is
  recursive — every user and group filed under the provider is deleted with it, with no warning, no count
  and nothing to undo. The only failure it reports is `IdProviderNotFoundException`, for a path that was
  not there. **Whether a provider is empty is the client's question to ask**, which is what the Delete
  action's `deletable` guard does with the `users` and `groups` totals; app-users asks its own server the
  same thing through `IdProvider.checkOnDeletable`.

## `findUsers` sorts; `findPrincipals` cannot

The two go through different code entirely, and the asymmetry decides how the Users section is built.

`findPrincipals` builds its node query in `PrincipalQueryNodeQueryTranslator`, which sets `from`,
`size`, filters and — when `searchText` is given — a `fulltext OR ngram` expression constructed with
`Collections.emptySet()` for its order list. No `addOrderBy` anywhere. Results therefore come back in
the engine's order: by relevance when searching, by internal index order otherwise, and the latter is
not a contract. Order does survive the trip — `SecurityServiceImpl.query` re-fetches by id and
`NodeBranchEntries` is backed by an insertion-ordered `ImmutableMap` — but it is not an order we
chose. **Paging through `findPrincipals` without `searchText` is therefore unsound.**

`findUsers` takes a raw `query` and a raw `sort`, both parsed by `QueryParser` and folded into one
`QueryExpr` that `UserQuery` carries. Users get paging, arbitrary filtering and real sorting from the
platform, with no bean needed. Two consequences: the sort expression is ours to build, so the query
string is an injection surface that needs escaping in one place; and there is no `findGroups`, so a
section other than Users that ever needs paging has to go to `lib-node` by hand.

**Do not grep the query classes for `sort` or `order` — the ordering is not a field on them.**
`AbstractQuery` assembles `orderBys` from `builder.query.getOrderList()`, so it rides inside the
`QueryExpr`. Searching `UserQuery.java` for the word finds nothing and reads as proof of absence; it
is not, and that mistake was made here once already.

## GraalJS serves no bytes, and gives an app one JS thread

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

## `lib-graphql` constraints

- **An explicit null argument is _not_ dropped on the way in.** This one is worth stating flatly, because
  the opposite is the natural assumption from how bean _output_ behaves: `ScriptMapGenerator.putInMap`
  drops a null key, which is why a principal with no display name arrives without the property. Arguments
  go the other way. `MapMapper.serializeKeyValue` in lib-graphql 3.0.0 carries a deliberate workaround —
  `// Temporary workaround. XP < 7.8 ignores null values in MapGenerator` — which calls
  `gen.rawValue(key, null)`, and `GraalScriptMapGenerator.putRawValueInMap` has **no null check**, unlike
  `putInMap` directly above it. So `password: null` reaches a resolver as `null`, present. Any argument
  guard has to be `!= null`; `!== undefined` alone lets a null through into arithmetic or `.length`.
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
  always HTTP 200. **No `path`** — graphql-java puts one on `ExceptionWhileDataFetching`, and
  `ExecutionResultMapper.serializeError` does not copy it, so an error cannot be attributed to a field
  by anything but position in the document.
- **`data` is omitted, never null.** `ExecutionResultMapper.serializeData` writes the key only
  `if (executionResult.getData() instanceof Map)`. Combined with § 6 of the spec — a field error
  propagates up through non-null positions and nullifies the root `data` when every position on the way
  is non-null — a single failing resolver under an all-non-null path produces `{ errors: [...] }` and
  nothing else. Declaring a field nullable is what keeps a failure local.
- **Resolvers run on the request thread.** `GraphQL.newGraphQL(schema).build()` takes the default
  `AsyncExecutionStrategy`, whose "asynchronous" is about composing `CompletableFuture`s:
  `ExecutionStrategy.getAsyncFieldValueInfo` invokes each DataFetcher inline and no executor appears
  anywhere in the strategy. A resolver returning a materialized value therefore never leaves the calling
  thread, which is why several root fields in one document are safe on GraalJS — and why they cost the
  sum of their time.

## Enonic Market is a headless site, and its data has five traps

Not XP itself, but the same kind of fact: what the market answers, as opposed to what the code
reading it assumes. Everything here was checked by querying `https://market.enonic.com/api/graphql`
directly (POST, no auth, introspectable), which is also how to re-check it.

- **The url is nobody's platform service.** app-applications publishes it from an OSGi component of
  its own — `MarketConfigService`, `configurationPid = "com.enonic.xp.market"`, default
  `https://market.enonic.com/api/graphql` — so there is no XP API to ask. This app reads its own
  `app.config['marketApiUrl']` instead, which is `lib/market.ts`.
- **`queryDsl` defaults to ten results.** Omit `first` and the market silently answers ten of the
  twenty-four applications that currently claim XP 8 support — the same truncation `findPrincipals`
  has with its default `count`. Always pass `first`.
- **`supportedVersions` is a minimum, never a range**, and it arrives as a list even with one entry.
  Nothing in the data says a release stopped working, so "runs on this XP" can only be read as
  "its declared minimum is not newer than we are" — which means an application whose 7.x line is
  numbered above its 8.x line offers a 7-era jar as its newest supported release. app-applications
  reads it the same way; `supportsXpVersion` in `market.source.ts` carries the note.
- **Versions come back unordered** — Guillotine lists `8.0.0` between two 7.x entries, Data Toolbox
  puts `3.0.0` among the `2.2.x`. Latest comes from a comparator, never from position.
- **`sha512` is null on every release from before XP 8**, and `pageUrl` is relative
  (`/vendors/enonic/guillotine`) while `icon.attachmentUrl(type: absolute)` is absolute. `vendor` is a
  content id, not a name, so it is useless without a second query.

## `admin.getVersion()` is the XP version; `app.version` is ours

app-applications passes `app.version` to the browser as `xpVersion`, which is correct only because it
ships with the distribution and shares its version. This app is versioned separately, so anything
comparing against the running platform — the market filter is the case — has to call
`getVersion()` from `/lib/xp/admin`. It carries the build suffix (`8.1.0-SNAPSHOT`).

## Admin access: four gates, and `system.admin` walks through all of them

The shell hands out no section access of its own — every gate below is the platform's, verified in
`../xp`:

- **The floor.** `AdminExtensionDispatcherApiHandler:19` and `EventApiHandler:22` both declare
  `allowedPrincipals=role:system.admin.login`, and app-main's `menu`/`menu-loader` extensions allow
  `role:system.admin` **and** `role:system.admin.login`. So an admin tool open to `admin.login` is
  fully functional for a non-admin: menu, event socket, discovery and mounting all answer.
- **Discovery is filtered server-side, per caller.** `GetListAllowedAdminExtensionsHandler:58-62`
  reads the principals off the current context and keeps only rows whose
  `isAccessAllowed(principals)` passes; `AdminExtensionApiHandler:71` runs the same check again on
  every request to the extension's own prefix. Menu and access therefore cannot disagree — they are
  one check — and **a client must never re-filter the list it is given.**
- **`AdminExtensionDescriptor.isAccessAllowed:88-92`**: `allowedPrincipals == null` (no `allow` in
  the descriptor) → everyone past the tool; `[]` → nobody but admin; listed → admin or listed. In
  every branch **`RoleKeys.ADMIN` short-circuits the check**, so a `system.admin` sees every section
  whatever its descriptor says. Testing that an `allow` excludes someone requires a non-admin
  account; as an admin the section is always there.
- **`AdminToolDescriptor.isAccessAllowed:80-83` is asymmetric with the above**: there is no null
  branch, so an `AdminTool` with no `allow` admits admin alone, and a listed principal is admitted
  _in addition to_ admin — never instead of.

## Pin every `@enonic-types` dependency

npm's `latest` tag is **7.16.7** for all of them even though 8.0.3 exists. Unpinned means 7.x types
(where `lib-schema` still has `XDATA`, and `displayName` instead of `title`) against an 8.x runtime.

The types also lag the runtime, and this app builds against 8.1.0-SNAPSHOT. `lib-auth` is the case:
`getIdProviders()` and `createIdProvider()` exist in the 8.1 lib but are declared in no stable types
release, so `@enonic-types/lib-auth` is pinned to **`8.0.4-B1`** — exact, no caret, because it is a
prerelease. **Read the lib's own `.ts` in `../xp/modules/lib/`, not `node_modules`, before concluding a
function does not exist.** Doing the reverse produced a wrong "this needs Java" call once already.

## Adding Java to this repo is nearly free

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
