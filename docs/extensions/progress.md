# Extensions — progress

Status of every phase in [`docs.md`](./docs.md) § 4, plus the `@enonic/ui` workstream in its § 3.
Facts live in `host-facts.md` and `provider-facts.md`, decisions in `docs.md` — this file is status
only.

Host: app-settings, branch `extensions`. First provider: app-applications, branch `issue-2297` off
that repo's own `extensions` (`issue-2295` merged there as #2296) — it replaces that app's UI, so it
cannot merge before Phase 3 ends.

Phase 3's removal branch (`issue-117`) is based on `issue-118`, the admin events hub change, and the
provider's `issue-2301` on its `issue-2314` counterpart. Both rebase onto their repo's `extensions`
once those two merge; until then the hub work and the Applications move only exist together on the
pair.

## Phase 0 — enough contract to start: done

| `docs.md` | What                                                                  | State |
| --------- | --------------------------------------------------------------------- | ----- |
| 0.1–0.2   | one contract file in both repos; the host's mount compiles against it | done  |

## Phase 1 — prove the hard parts on a scratch provider: in progress

| `docs.md` | What                                                                                      | State                                                                                          |
| --------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1.1       | `POST /graphql` on the extension prefix                                                   | done — verified on a live XP                                                                   |
| 1.2       | shadow root, `adoptedStyleSheets`, theme tokens; dialog/select/tooltip via `AppRoot`      | root and theming done on `@enonic/ui` 1.2.0 (npm-enonic-ui#534, released); overlays unverified |
| 1.3       | host object v1                                                                            | done                                                                                           |
| 1.4       | routing: splat, `path`, `navigate`, deep link, back/forward, collision, unknown section   | done — an unknown section redirects silently, by decision                                      |
| 1.5       | lifecycle: keep-alive, hidden behaviour, import timeout, error state, unmount, revocation | done                                                                                           |
| 1.6       | config and phrases as schema root fields                                                  | done                                                                                           |
| 1.7       | dev override from a local Vite dev server                                                 | not started                                                                                    |

Phase 1 exits when 1.2's overlays are verified, 1.7 is done or dropped, and the first two gaps below
are decided.

## `@enonic/ui` shadow workstream (`docs.md` § 3, parallel to Phase 1): shipped

| `docs.md` § 3 | What                                                     | State                                          |
| ------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 1             | `PortalProvider`                                         | shipped in `@enonic/ui` 1.2.0                  |
| 2             | focus and dismissal through `getRootNode`/`composedPath` | shipped in 1.2.0                               |
| 3             | `AppRoot`                                                | shipped in 1.2.0; the host and provider use it |
| 4             | CI smoke: dialog + select + tooltip inside a shadow root | in npm-enonic-ui; the permanent shadow tax     |

Landed as npm-enonic-ui#534, released 2026-08-25. Both repos take it from the registry. Its
acceptance test is 1.2's, which is why 1.2 is not closed.

## Phase 2 — extract the component kit: not started

| `docs.md` | What                                                                       | State       |
| --------- | -------------------------------------------------------------------------- | ----------- |
| 2.1       | `npm-enonic-toolkit` publishing `@enonic/toolkit`; contract as `./section` | not started |
| 2.2       | browse framework widgets out of `widgets/`, host-free                      | not started |
| 2.3       | request plumbing, format helpers, i18n hook, dialog/form shells            | not started |
| 2.4       | app-settings consumes the kit while still owning all five sections         | not started |
| 2.5       | the provider renders a real browse screen from the kit                     | not started |
| 2.6       | Content Studio v6 as a second consumer                                     | not started |

## Phase 3 — Applications moves out (into app-applications): done

| `docs.md` | What                                                            | State                                                    |
| --------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 3.1       | skeleton: descriptor, controller, `_static`, Gradle wiring      | done — merged to app-applications' `extensions` as #2296 |
| 3.2       | move the applications GraphQL schema and beans                  | done — see below                                         |
| 3.3       | move the client slices                                          | done — batches 1–5, app-applications #2301               |
| 3.4       | wire upload/lifecycle calls                                     | done — 3.4.2–3.4.4 in #2301; 3.4.1 reversed, see below   |
| 3.5       | cut over; delete the slice from app-settings; the old tool goes | done — see below                                         |
| 3.6       | harden: deep links, error/empty states, i18n keys moved         | done — see below                                         |

### What 3.2 left behind

The working plan for 3.2 lived in a gitignored file, so these four are recorded here or nowhere.

- **3.2 ran before Phase 2, deliberately.** Nothing server-side needs the component kit, so § 4's
  "the kit is extracted before any section moves out" does not bind. The rule still binds 3.3.
- **`docs.md` 3.2 is one field short of literal.** `idProviderApplications` stayed in app-settings —
  it is the ID Providers editor's question ("which applications can this provider bind to"), not an
  Applications screen's — so `apis/graphql/application/` survives in the host holding that one field
  until 4.2 takes it. The id-provider descriptor bean is therefore **duplicated, not moved**: both
  apps carry `GetIdProviderDescriptorHandler` and `IdProviderDescriptorMapper`.
- **Two operator-facing cfg keys are now app-applications'**, as of this phase: `marketApiUrl`
  unchanged, and `applications.managedMode` → **`managedMode`** (the prefix that told one section's
  cfg from another's is redundant inside the provider's own `.cfg`). It reads through
  `config.managedMode` on the provider's schema.
- **3.3 inherits seven stripped managed-mode guards.** Removing `appsManagedMode` from the host took
  the guards with it across six files under `pages/applications/`, each left as a `// TODO: Restore`
  quoting what it was. Rewiring them against the provider's `config.managedMode` is part of moving
  those files, not a follow-up: until then the section behaves as if managed mode were always off,
  which on a managed instance means offering install, uninstall, start, stop and links out.
  `grep -rn 'TODO: Restore' pages/applications/` is the list.

### What 3.5 kept, and why

The deletion was scoped by asking who else consumes each file, not by name. Three things stayed in
app-settings because the **ID Providers editor** still reaches for them, and they go to app-users with
that editor in 4.3:

- `entities/application/api/id-provider-applications.api.ts` — `fetchIdProviderApplications`, the
  question "which applications can a provider bind to". Its root field is the `apis/graphql/application/`
  remainder 3.2 already left for the same reason.
- `IdProviderApplication` — the one type left in `model/application.types.ts`, which is now a file
  with a `// ?` block explaining why a lone id-provider type lives in a slice named `application`.
- `ApplicationIcon` — `features/idprovider-editor/IdProviderForm.tsx` renders it as the placeholder
  glyph in the application picker. **Kept whole**, though that one caller passes no props at all: its
  icon, size, and system/local badge branches are unreachable in the host today. Trimming it would
  diverge it from the provider's copy for no gain, and 4.3 can take it either way. The two
  `applications.badge.*` phrases stay with it — the only `applications.*` keys left in the bundle.

Also kept, because the four principal sections use them: `shared/dialog/`, `shared/ui/dialogs/`.

**Deleted** beyond the obvious slice, each after confirming its only consumer was Applications and that
neither the legacy app-users nor its planned sections have one: `shared/ui/{DropZone,ProgressBar,ProgressButton}.tsx`
and `progress.ts`, and `shared/api/upload.ts` (`requestUploadJson`). All live on in app-applications,
which is where Phase 2 will extract them from.

`shared/server-events/` went with them, whole. #118 had already moved the shell to the admin events hub
and left that module standing only for the departing Applications and Market slices; with those gone its
last reader was the `connected` member #117 had added to the mount contract, and since #118 had taken
`subscribeEvents` out there was nothing left for it to report, so it went too. The host now has one
event path and no websocket of its own: `lib/events.ts` publishes, `shared/admin-events` subscribes.

`shared/format/bytes.ts` is dead in the host too, but it arrived with the browse framework (#17) rather
than with Applications, so 3.5 left it alone. Worth a look in Phase 5.1.

The old lib-admin-ui tool needed nothing: app-applications' `issue-2301` branch had already dropped
`admin/tools/main/` and 110 legacy files in 3.1–3.2. Its `admin/` now holds only the extension.

### What 3.6 found

Deep links and the i18n move were already carried by 3.3–3.4 — the section reads its sub-path from
`host.path`, `shared/routing` unit-tests the round trip, and every key the provider names is in its own
bundle. Two real gaps turned up in the audit, both fixed:

- **Three phrases were missing from the provider.** `applications.dialog.install.filter{All,Installed,Update}`
  are named as JSX `labelKey` attributes, in double quotes, which the key audit I ran during 3.4.4 had
  missed. The market filter bar's three tabs would have rendered their raw keys.
- **The remembered column width used two different storage keys.** The host wrote
  `app-settings.browse-layout.details-width` and the provider `browse-layout.details-width`, so dragging
  the divider in a host-owned section and then opening the Applications extension would have jumped it
  back to the default. Both now use the provider's un-namespaced key, and `browse-layout.ts` is
  byte-identical in the two repos again. **Whether the whole family belongs under `xp.admin.*` is still
  open** — that is now a one-line change in two files.
- **`shared/api/upload.test.ts` was about to be lost.** 3.4.2 moved `upload.ts` to the provider without
  its test, and 3.5 deleted the host's copy. The test moved before the deletion landed.

The full host↔provider diff is now 22 of the 81 files the two share, every one an intended divergence:
the api client's endpoint source and queueing, config, the two `shared/admin-events` copies (the host
publishes and subscribes, the provider only subscribes), the contract's two copies, the notifications
adapter, and five browse widgets — of which the substantive one is `BrowseLayout`'s `detailsShown`
prop replacing `useChildMatches`, which is Phase 2.2's unwind done early.

**Not verified in a browser.** No Chrome extension is connected to this session, so the whole
Applications section — market grid, install from market and from jar, update, progress, and the dialogs
portalling inside the shadow root — is unexercised end to end. That is the one thing standing between
"3.5 and 3.6 are code-complete" and "Phase 3 is proven".

### 3.4 revisited — core api urls left the contract

3.4.1 put a `coreApis` map on the mount contract: the host read its own tool config and handed every
section the base urls of the core APIs the page mounts. That is gone. The provider's `config` root
field answers `serverAppUrl` instead, built with `portal.apiUrl({api: 'server:app'})`.

- **It works because a request to an extension keeps the hosting tool's `baseUri`.** `SlashApiHandler`
  sets only `contextPath` for an endpoint request, so `ApiUrlBaseUrlResolver` anchors the url at
  `/admin/<host app>/<tool>/_/server:app` — the host's own url, built from the provider's controller.
- **The mount is unchanged.** `verifyRequestMounted`'s `ADMIN_TOOL` branch checks the _tool_
  descriptor, so `server:app` stays in `admin/tools/main/main.yaml`, now with a comment saying it is
  there for the Applications section and for nothing in this app.
- **What went with it**: `apis.core` from `ToolConfig` (server and client types both),
  `shared/config/core-api.ts` here, `shared/host/core-api.ts` in the provider, and the `coreApis`
  member from both copies of `contract.ts` — which now differ only in their module doc comment. The
  provider gained `shared/config/server-app.ts`, which has no counterpart here.
- **What the section lost**: it can no longer tell _before_ posting whether the page mounts the api. A
  host that does not list `server:app` answers with a 403 rather than the section refusing the call.
  Accepted — the mount is a static fact of a first-party host.

## Phase 4 — Users, Groups, Roles, ID Providers move out (into app-users): not started

| `docs.md` | What                                                                     | State       |
| --------- | ------------------------------------------------------------------------ | ----------- |
| 4.1       | skeleton — four extensions, one shared module                            | not started |
| 4.2       | finish unified-api Phase 3, then move the auth schema and beans as files | not started |
| 4.3       | move the four client slices and their features                           | not started |
| 4.4       | cut over section by section; a mixed rail during the transition          | not started |
| 4.5       | old app-users tool goes                                                  | not started |

4.2 also takes the host's remaining `apis/graphql/application/` field, `lib/idprovider.ts` and its
Java package. After it, app-settings has no `src/main/java` and no GraphQL API at all — which is 5.1.

## Phase 5 — the host becomes a shell: not started

| `docs.md` | What                                                                   | State                             |
| --------- | ---------------------------------------------------------------------- | --------------------------------- |
| 5.1       | delete `pages/`, `entities/`, `features/`; drop the host's GraphQL API | not started                       |
| 5.2       | harden shell-only concerns                                             | partly done — see Beyond the plan |
| 5.3       | freeze contract v1, write the upgrade policy                           | not started                       |
| 5.4       | optional: a documented sample extension                                | not started                       |

## Beyond the plan

Done ahead of the phase that asks for it.

| What                                                                                   | Where it belongs   |
| -------------------------------------------------------------------------------------- | ------------------ |
| rail follows application events over the hub topic; loss triggers rediscovery          | § Discovery 6      |
| tool `allow` = the union of the section audiences; empty and failed rail states (#113) | § Security and 5.2 |

## Known gaps

- **Market install progress is inert.** XP reports a download as `PROGRESS` application events, which
  the hub excludes deliberately, so nothing feeds the provider's `receiveInstallProgress` and a market
  install renders a bar stuck at 0 — as it already did for a download core cannot measure.
  `server:app`'s SSE channel is the carrier left and has no consumer yet; the store and its test stay
  as the seam one would call. Uploading a jar is unaffected — that progress is the browser's own XHR.
- The provider's applications and market services subscribe the hub topic from `mount` rather than
  from the module. A provider pointing several descriptors at one module would have the first unmount
  detach a subscription the others are still reading — latent while app-applications ships one
  section, and the same trap `app/events.ts` documents for the connection itself.
- **Merge blocker.** The host's five built-in sections are commented out (`app/model/router.ts`,
  `app/ui/App.tsx`; `pages/**` unlinted); `docs.md` 2.4 and 4.4 keep them until Phases 3–4. Either
  they return beside the discovered ones — a mixed rail — or `docs.md` changes its sequence.
  `pages/applications/` now also carries 3.2's seven managed-mode TODOs.
- A failed rediscovery still empties the rail and unmounts every section — it now says so
  (`sections.failed`) rather than showing a blank panel.
- No host-side skeleton between import and the guest's first paint; the guest's own is what shows.
- `mount` carries no section identity; a multi-section provider parses `host.baseUrl`. An additive
  contract member to consider before Phase 2 freezes the types.
- An app's sections now share one module instance: the host points the whole group at its first
  row's entry url (`shareModules` in `extensions.api.ts`), with `config.module` as the opt-out. The
  contract's `SectionModule` comment carries the multi-mount rule; app-users' copy is updated,
  app-applications' copy still needs the same lines.
- `@enonic/ui` is not tree-shakeable, so a section costs ~88 kB gz JS + ~15 kB gz CSS before it
  renders anything of its own.
- Nothing on the provider side exercises the host object: its section renders a hardcoded page, so a
  regression in `navigate`, `path`, events or `notify` surfaces only when Phase 3's real screen uses
  them. No test replaces it.
- Provider: `systemApp = true` blocks uninstall (stopping is how a section leaves the rail); no
  `Cache-Control` on `_static/*`; no bootstrap retry.
- 15 host test files each build a config fixture; one field breaks them all. No issue filed.
- `CLAUDE.md`, `AGENTS.md` and `README.md` carry a status banner, not a rewrite: below it they still
  describe the app as the frame that owns the five sections. `.claude/rules/structure.md` § Sections
  is current.

## Drift to fix in `docs.md`

- § 2 names the types subpath `@enonic/toolkit/mount-contract`; § 1 and 2.1 say
  `@enonic/toolkit/section`. Code assumes `section`.
- ~~§ Discovery 1: a multi-section provider's module runs once per section, not once~~ — resolved
  code-side instead: the host now groups an app's rows onto one module url, as § Discovery 1 always
  described.
- § Discovery 5 and the § 2 table: the stylesheet under `_static/` is an unhashed `main.css`, which
  the guest resolves relative to its module url.
- § Routing: hash history, not "real history" — anchor interception is unnecessary; an unknown
  section redirects without a notice.
- § Lifecycle: two failure modes (the module would not load; the module could not reach its data),
  and no host skeleton.
- § 3 / 1.2: the `@enonic/ui` workstream landed and shipped in 1.2.0 (npm-enonic-ui#534,
  2026-08-25); the provider takes it from the registry.
- § 4 sequencing: "the kit is extracted before any section moves out" was knowingly broken by 3.2,
  which is server-side only. Either the rule says "no _client_ slice moves before the kit", or 3.2 is
  named as its exception.
- § 4 Phase 3.2: "move the applications GraphQL schema and beans" is one field short of literal, and
  one bean is duplicated rather than moved — see _What 3.2 left behind_.
- § 5: the failed stage is named in the console and one phrase shown, by decision; the watch list's
  14 config fixtures are 15.
- The platform facts at the end of `provider-facts.md` belong in `../platform-facts.md`.
