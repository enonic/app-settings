# App Settings

Enonic XP's Settings admin tool: the **shell** that discovers administration sections other
applications provide and hosts them on one page. A section is an admin extension on the
`settings.section` interface — app-applications ships Applications, app-users ships Users, Groups,
Roles and ID Providers — and this app owns what they share: the app bar, the section rail, the
theme, the toast stack, the url and the admin events hub topics. It renders nothing of a section
itself. Single Gradle project, XP 8.1, TypeScript, Preact (React compat), Tailwind CSS v4,
nanostores, TanStack Router. No `lib-admin-ui`.

**`docs/extensions/` is authoritative on how the shell works** — read `docs.md` before touching the
host↔section boundary, `host-facts.md` for what the code does today, `provider-facts.md` for the
other side, `progress.md` for what stands. `docs/platform-facts.md` records what XP actually does
where its types and documentation mislead — **read it before concluding an XP lib cannot do
something**, and re-verify against `../xp` rather than re-deriving.

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
Gradle when descriptors, `build.gradle` or the jar matter; for most changes `pnpm check` is enough.
There is no Java in this app.

### Toolchain

- **Build/lint/format/test**: vite-plus (`vp`), configured inline in `vite.config.ts`. Lint is
  oxlint (type-aware), format is oxfmt — 2-space indent, single quotes, sorted imports and
  Tailwind classes. `admin/**` is excluded from both (CJS + XP globals, outside tsconfig).
- **Typecheck**: native TypeScript 7, `strict: true`, `noEmit` — bundlers do the emit. Client
  config is the root `tsconfig.json`, server config is `src/main/resources/tsconfig.json`.
- **Client**: Preact 10 with `react`/`react-dom` aliased to `preact/compat` in both `vite.config.ts`
  and `tsconfig.json`. `@enonic/ui` is Preact-native; Radix ref type mismatches are expected.
  `@radix-ui/react-slot` and `focus-trap-react` are `@enonic/ui`'s peers, declared here because the
  library does not tree-shake and the bundle resolves both whether or not the shell uses them.
- **Server**: `vp pack` (tsdown) emits per-file CommonJS into `build/resources/main`, target
  `es2023` — safe because `build.gradle` pins `scriptEngine = 'GraalJS'`.
- **XP libs**: server code requires them absolutely (`/lib/xp/admin`); types resolve through the
  `paths` in the server tsconfig. Adding a lib means an `include xplibs.<name>` in `build.gradle`
  **and** a double in `src/test/mocks/` plus an alias in the `test.alias` block of `vite.config.ts`.
  Not every XP lib has a published type package — hand-write a minimal declaration under
  `src/main/resources/types/` instead of downgrading, as `event.d.ts` and `mustache.d.ts` do.

## Structure

```
src/main/resources/
  admin/tools/main/     the single admin tool: descriptor, controller, page template
  lib/                  server modules: tool config, i18n, the admin guard, the hub topics (`events/`)
  types/                hand-written declarations for XP libs without a type package
  i18n/phrases.properties
  assets/js/
    app/                shell, router, the host object, section mounting
    widgets/            the rail, the mount slot, the empty state, the toast list
    features/           theme switcher
    entities/extension/ discovery: the rows, their sorting and slugs, rediscovery on events
    shared/             api client, config, i18n, admin events, notifications, app state, sections
                        (the mount contract and `mountSection`), menu
```

Import direction is one-way: `app → widgets/features → entities → shared`. Details and the
reasoning are in `.claude/rules/structure.md`. `shared/sections/contract.ts` is the mount contract,
duplicated byte-identically in every provider until `@enonic/ui-types` publishes it; change every
copy or none.

## Reference repositories

Sibling checkouts. Paths are relative to this repo's parent directory.

| Repo                       | What to read it for                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../app-applications`      | The provider of the Applications section, one extension. `assets/js/main.ts` and `app/` are what mounting looks like from the guest's side; its `.claude/rules/sections.md` is the guest's rule.                                   |
| `../app-users`             | The provider of Users, Groups, Roles and ID Providers — four extensions, one module. `shared/host/` is the per-mount host frame the toolkit's section runtime is modelled on; `docs/unified-api.md` is its GraphQL layer's design. |
| `../npm-enonic-ui-toolkit` | `@enonic/ui-types`, `ui-utils`, `ui-kit`, `input-types`: where the contract and the providers' shared widgets are being extracted to. `docs/browse-framework.md` there is the browse screen every section composes.                |
| `../npm-enonic-ui`         | Source of `@enonic/ui`. Read a component before composing it — several fail silently, see `.claude/rules/enonic-ui.md`.                                                                                                            |

The providers' `widgets/`, `shared/` and `.claude/rules/` were copied out of this app when the
sections moved and are now the canonical copies of that code; nothing here mirrors them any more.

## Conventions

- `.claude/rules/` holds them, scoped by file pattern: `structure.md`, `typescript.md`, `preact.md`,
  `stores.md`, `requests.md`, `enonic-ui.md`, `testing.md`, `comments.md`. Read the relevant rule
  before writing in that area.
- Every user-visible string goes through `shared/i18n`: a component names its strings at the top with
  the `useI18n(key)` hook and renders them by name, and `i18n(key)` is the plain function for where a
  hook cannot go. Phrases live in `i18n/phrases.properties`, sentence-case. The shell's keys are
  `app.*`, `nav.*`, `sections.*`, `sectionMount.*`, `notifications.*`, `theme.*` and `admin.tool.*`,
  which XP resolves from `main.yaml`. A section's phrases are the provider's own and never enter
  this bundle.
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
