# App Settings

Enonic XP admin application: one frame for the Applications, Users, Groups, Roles and ID Providers
sections. Single Gradle project — TypeScript, Preact (React compat layer), Tailwind CSS v4,
nanostores, TanStack Router. The admin tool is restricted to `role:system.admin`.

The app replaces `app-users` and `app-applications`. Every section is the same browse screen with
different data: full-width action toolbar, list column (search, list header, rows), details column.
That screen is a shared framework — **read `docs/browse-framework.md` before adding a section or
touching `widgets/`.**

## Scripts

| Intent                            | Command                         |
| --------------------------------- | ------------------------------- |
| Verify changes                    | `pnpm check`                    |
| Verify, fixing format and lint    | `pnpm check:fix`                |
| Tests                             | `pnpm test` / `pnpm test:watch` |
| Frontend watch build              | `pnpm dev`                      |
| Server-side TS → CommonJS         | `pnpm pack:server`              |
| Build + deploy to local XP        | `./gradlew deploy -Penv=dev`    |
| Full watch loop (server + assets) | `./gradlew dev`                 |

`pnpm check` is what CI runs: format, lint, client typecheck, server typecheck, tests. Reach for
Gradle only when descriptors, `build.gradle` or the jar itself matter; for most changes `pnpm check`
is enough.

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
src/main/resources/
  admin/tools/main/     the single admin tool: descriptor, controller, page template
  apis/                 app-owned HTTP APIs, one folder per api (added when a section needs one)
  lib/                  server modules (auth guard, i18n, tool config)
  types/                hand-written declarations for XP libs without a type package
  i18n/phrases.properties
  assets/js/
    app/                shell, router, navigation
    pages/              one slice per section — composition only
    widgets/            composite section-agnostic blocks (the browse framework)
    features/           user-facing actions (dialogs, wizards, commands)
    entities/           domain models: types, api, stores
    shared/             api client, config, i18n, server events, app state, formatting
```

Import direction is one-way: `app → pages → widgets/features → entities → shared`. Details and the
reasoning are in `.claude/rules/structure.md`.

## Conventions

- `.claude/rules/` holds them, scoped by file pattern: `structure.md`, `typescript.md`, `preact.md`,
  `stores.md`, `requests.md`, `enonic-ui.md`, `testing.md`, `comments.md`. Read the relevant rule
  before writing in that area.
- Every user-visible string goes through `useI18n()`; phrases live in `i18n/phrases.properties`,
  sentence-case, grouped by section. Existing keys are `nav.<section>`, `section.<section>.title` and
  ungrouped app-shell keys; new section keys extend that as `<section>.<area>.<name>`.
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
