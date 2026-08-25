# App Settings

Enonic XP admin application: one frame for the Applications, Users, Groups, Roles and ID Providers
sections. Single Gradle project — TypeScript, Preact (React compat layer), Tailwind CSS v4,
nanostores, TanStack Router. The admin tool is restricted to `role:system.admin`.

> **Status — the `extensions` branch is turning this app into a hub.** Sections are discovered at
> runtime as `settings.section` admin extensions provided by other apps; the Applications, Users,
> Groups, Roles and ID Providers code still in this repo is on its way out to `app-applications` and
> `app-users`, and none of it is routed today — `pages/` is dark. **`docs/extensions/` is
> authoritative on how the shell works**: `docs.md` for the design and its phases, `progress.md` for
> what stands. Everything below still describes this app as the frame that owns those five sections,
> which is the pre-extension picture — treat it as a description of the code that has yet to move,
> and rewrite this file when the migration lands.

Every section is the same browse screen with different data: full-width action toolbar, list column
(search, list header, rows), details column. That screen is a shared framework — **read
`docs/browse-framework.md` before adding a section or touching `widgets/`.**

Three documents carry what the code cannot say. `docs/browse-framework.md` is the contract for that
screen. `docs/unified-api.md` is the plan for the one GraphQL layer all five sections read through,
with its decisions and phases. `docs/platform-facts.md` records what XP actually does where its types
and documentation mislead — **read it before concluding an XP lib cannot do something**, and re-verify
against `../xp` rather than re-deriving.

## Scripts

| Intent                            | Command                         |
| --------------------------------- | ------------------------------- |
| Verify changes                    | `pnpm check`                    |
| Verify, fixing format and lint    | `pnpm check:fix`                |
| Tests                             | `pnpm test` / `pnpm test:watch` |
| Frontend watch build              | `pnpm dev`                      |
| Server-side TS → CommonJS         | `pnpm pack:server`              |
| Java (script bean) tests          | `./gradlew test`                |
| Build + deploy to local XP        | `./gradlew deploy -Penv=dev`    |
| Full watch loop (server + assets) | `./gradlew dev`                 |

`pnpm check` is what CI runs: format, lint, client typecheck, server typecheck, tests. Reach for
Gradle when descriptors, `build.gradle`, the jar or `src/main/java` matter; for most changes `pnpm check`
is enough. `./gradlew test` runs the script beans through GraalJS against the golden fixtures under
`src/test/resources`, and depends on `pnpmPack` because those fixtures require the compiled wrappers.

### Toolchain

- **Build/lint/format/test**: vite-plus (`vp`), configured inline in `vite.config.ts`. Lint is
  oxlint (type-aware), format is oxfmt — 2-space indent, single quotes, sorted imports and
  Tailwind classes. `admin/**` is excluded from both (CJS + XP globals, outside tsconfig).
- **Typecheck**: native TypeScript 7, `strict: true`, `noEmit` — bundlers do the emit. Client
  config is the root `tsconfig.json`, server config is `src/main/resources/tsconfig.json`.
- **Client**: Preact 10 with `react`/`react-dom` aliased to `preact/compat` in both `vite.config.ts`
  and `tsconfig.json`. `@enonic/ui` is Preact-native; Radix ref type mismatches are expected.
- **Server**: `vp pack` (tsdown) emits per-file CommonJS into `build/resources/main`, target
  `es2023` — safe because `build.gradle` pins `scriptEngine = 'GraalJS'`.
- **XP libs**: server code requires them absolutely (`/lib/xp/auth`); types resolve through the
  `paths` in the server tsconfig. Adding a lib means an `include xplibs.<name>` in `build.gradle`
  **and** a double in `src/test/mocks/` plus an alias in the `test.alias` block of `vite.config.ts`.
  Not every XP lib has a published type package, and some stop before 8.x — hand-write a minimal
  declaration under `src/main/resources/types/` instead of downgrading, as `mustache.d.ts` does.

## Structure

```
src/main/java/          script beans, one package per lib/*.ts that wraps them — only for data no
                        XP JS lib exposes
src/main/resources/
  admin/tools/main/     the single admin tool: descriptor, controller, page template
  apis/                 app-owned HTTP APIs, one folder per api (added when a section needs one)
  lib/                  server modules (auth guard, i18n, tool config, bean wrappers)
  types/                hand-written declarations for XP libs without a type package
  i18n/phrases.properties
  assets/js/
    app/                shell, router, navigation
    pages/              one slice per section — composition only
    widgets/            composite section-agnostic blocks (the browse framework)
    features/           user-facing actions (dialogs, wizards, commands)
    entities/           domain models, one slice per domain: api/, model/, ui/ segments
    shared/             api client, config, i18n, server events, notifications, app state,
                        formatting
```

Import direction is one-way: `app → pages → widgets/features → entities → shared`. Details and the
reasoning are in `.claude/rules/structure.md`.

## Reference repositories

Sibling checkouts, read-only — nothing here imports from them. Paths are relative to this repo's
parent directory. The list grows as further admin applications are folded into this app.

| Repo                   | What to read it for                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../app-users`         | The app the Users, Groups, Roles and ID Providers sections replace. `assets/js/app/browse/` for list rows, toolbar and actions (plus `browse/serviceaccount/`), `wizard/` for principal CRUD, passwords and public keys, `report/` for permission reports, and the backend contracts under `src/main/resources/apis/graphql` and `apis/permissionReport`.                     |
| `../app-applications`  | The app the Applications section replaces. `assets/js/app/browse/` for the list with version and state cells, lifecycle actions and the system-app filter (`SystemAppsHelper`), `installation/` for install by URL and upload, `Market*.ts` with `resource/MarketApplicationFetcher.ts` for where "available version" comes from, and JAX-RS resources under `src/main/java`. |
| `../app-contentstudio` | The stack model. `modules/lib/src/main/resources/assets/js/v6/` is the Feature-Sliced tree this app follows — `widgets/browse-toolbar`, `widgets/browse-grid`, `widgets/context-panel`, `features/<action>/`, `entities/<domain>/`. Its `CLAUDE.md` and `.claude/rules/` are what these conventions were adapted from. Ignore `assets/js/app/`, which is legacy class-based.  |
| `../npm-enonic-ui`     | Source of `@enonic/ui`. Read a component before composing it — several fail silently, see `.claude/rules/enonic-ui.md`.                                                                                                                                                                                                                                                       |

This app targets XP 8.1 and has **no `lib-admin-ui` dependency** — dropping that framework is the
point of the rewrite. The two apps being replaced target the same XP version, so their server-side
contracts, permissions and event handling are current and worth following closely; their UI is built
on lib-admin-ui (class-based components, `Q` promises, imperative DOM) and is reference-only. Take
behaviour, data shapes and edge cases from them, never structure or style.

Content Studio is an example, not an authority: its v6 tree is Preact and Tailwind like ours and worth
reading closely, but 4-space arrow components, imports from `react`, `should` test names and a DOM test
environment are its conventions, not ours, its entity slices are segmented inconsistently, and its
legacy layer still runs on lib-admin-ui. Where the two disagree, `.claude/rules/` wins — the aim is to
be tidier than the example, not to match it.

**Overlap with Content Studio v6 is expected and will be extracted, not duplicated.** Browse widgets,
formatting helpers, request plumbing and parts of the XP API surface are the same problem solved
twice, and the plan is to move that common ground into a shared library. So anything written here
that has a v6 counterpart should stay portable — no reaching into this app's config, stores or i18n
keys beyond what its props carry — and is worth naming in review as a candidate for extraction.

## Conventions

- `.claude/rules/` holds them, scoped by file pattern: `structure.md`, `typescript.md`, `preact.md`,
  `stores.md`, `requests.md`, `enonic-ui.md`, `testing.md`, `comments.md`. Read the relevant rule
  before writing in that area.
- Every user-visible string goes through `shared/i18n`: a component names its strings at the top with the
  `useI18n(key)` hook and renders them by name, and `i18n(key)` is the plain function for where a hook
  cannot go — a key that varies per row, a store, an entity command. Phrases live in
  `i18n/phrases.properties`, sentence-case, grouped by section. Existing keys are `nav.<section>`, `section.<section>.title`,
  `browse.*` for the browse widgets and ungrouped app-shell keys; new section keys extend that as
  `<section>.<area>.<name>`.
- Tests sit next to the code as `*.test.ts(x)`. The vitest environment is `node` and no DOM library
  is installed, so component rendering is not tested — keep testable logic in pure helpers.
- `AGENTS.md` is a copy of this file for agents that read that name. Edit both, keep them identical.

## Git & GitHub

No conventional commit prefixes. Plain descriptive language throughout.

### Issues

- **Title**: plain descriptive text — e.g. `Users section`, `BrowseList: add infinite scroll`
- **Body**: concisely explain what and why, skip trivial details

  ```
  <4–8 sentence description: what, what's affected, impact>

  #### Rationale
  <why this needs to be fixed or implemented>

  #### References            ← optional
  #### Implementation Notes  ← optional

  <sub>*Drafted with AI assistance*</sub>
  ```

### Commits

- **With issue**: `<Issue Title> #<number>` — e.g. `Users section #7`
- **Without issue**: capitalized plain-English description — e.g. `Fix build`
- **Body** (optional): imperative mood, one line per change, backticks for code refs

### Pull Requests

- **Title**: `<Issue Title> #<number>` — matches the commit title
- **Body**: concisely explain what and why, skip trivial details. No emojis. One blank line between
  sections.

  ```
  <summary of changes>

  Closes #<number>

  <sub>*Drafted with AI assistance*</sub>
  ```
