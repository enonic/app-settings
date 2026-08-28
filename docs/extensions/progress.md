# Extensions — progress

Status of every phase in [`docs.md`](./docs.md) § 4, plus the `@enonic/ui` workstream in its § 3.
Facts live in `host-facts.md` and `provider-facts.md`, decisions in `docs.md` — this file is status
only.

Host: app-settings, branch `extensions`. First provider: app-applications, branch `issue-2297` off
that repo's own `extensions` (`issue-2295` merged there as #2296) — it replaces that app's UI, so it
cannot merge before Phase 3 ends.

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

## Phase 3 — Applications moves out (into app-applications): in progress

| `docs.md` | What                                                            | State                                                    |
| --------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 3.1       | skeleton: descriptor, controller, `_static`, Gradle wiring      | done — merged to app-applications' `extensions` as #2296 |
| 3.2       | move the applications GraphQL schema and beans                  | done — see below                                         |
| 3.3       | move the client slices                                          | not started                                              |
| 3.4       | wire upload/lifecycle calls                                     | not started                                              |
| 3.5       | cut over; delete the slice from app-settings; the old tool goes | not started                                              |
| 3.6       | harden: deep links, error/empty states, i18n keys moved         | not started                                              |

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
| rail follows application events and socket reconnects                                  | § Discovery 6      |
| tool `allow` = the union of the section audiences; empty and failed rail states (#113) | § Security and 5.2 |

## Known gaps

- **Merge blocker.** The host's five built-in sections are commented out (`app/model/router.ts`,
  `app/ui/App.tsx`; `pages/**` unlinted); `docs.md` 2.4 and 4.4 keep them until Phases 3–4. Either
  they return beside the discovered ones — a mixed rail — or `docs.md` changes its sequence.
  `pages/applications/` now also carries 3.2's seven managed-mode TODOs.
- A failed rediscovery still empties the rail and unmounts every section — it now says so
  (`sections.failed`) rather than showing a blank panel.
- No host-side skeleton between import and the guest's first paint; the guest's own is what shows.
- `mount` carries no section identity; a multi-section provider parses `host.baseUrl`. An additive
  contract member to consider before Phase 2 freezes the types.
- The module runs once per section, not once per app: the entry url is per prefix.
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
- § Discovery 1: a multi-section provider's module runs once per section, not once; its module-level
  state is not shared.
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
