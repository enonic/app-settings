# Provider facts — the apps that ship sections

A provider ships one `AdminExtension` per section on `settings.section` and serves everything under
its own extension prefix. `docs.md` § 2 is the contract; this is what implementing it looks like, per
provider. `host-facts.md` is the other side.

## app-applications (`issue-2295`)

### What exists

- `admin/extensions/applications/` — `applications.yaml` (`order: 10`, `path: applications`,
  `allow: role:system.admin`), `applications.svg`, and `applications.ts`: the whole prefix in one
  controller — `get` serves `_static/*` as text (`text/javascript`, `text/css`), `post` hands
  `/graphql` to lib-graphql, anything else is a 404. A provider with several sections would lift the
  shared body into `lib/`; with one, it lives where it is used.
- `apis/graphql/` — schema built once per module require; every root nullable; no role check (the
  four platform gates already ran); roots `config { appId appVersion }` and `phrases(locale): Json`.
  Not under `graphql/`, which graphql-java occupies in the jar.
- `assets/js/main.ts` — `mount({container, host})`: starts the bootstrap, renders `App`, returns
  `() => render(null, container)`. Synchronous.
- `app/bootstrap.ts` — one document, `config` + `phrases(locale: host.locale)`, to
  `${baseUrl}/graphql`; memoized per module instance; `App` gates on it: skeleton → failure → screen.
- `app/App.tsx` — `AppRoot` from `@enonic/ui` with `theme` from `host.theme` and `stylesheets` from
  `$stylesheets`: it adopts the sheet into the shadow root, sets the theme class inside it and
  portals overlays inside it.
- `shared/styles/stylesheet.ts` — fetches `_static/main.css` (Tailwind + `@enonic/ui/preset.css`)
  into a `CSSStyleSheet` and sets `$stylesheets` only once loaded, since `AppRoot` reads the rules
  for its `@property` fallback. Fonts come from the host.
- `shared/{api,config,i18n,sections}` — verbatim from the host; the transport's endpoint is set by
  `setGraphQlEndpoint`. The bootstrap fills `config` and `i18n`; no UI reads them yet.
- `@enonic/ui` is `^1.2.0` from the registry — the release carrying `AppRoot` (npm-enonic-ui#534,
  released 2026-08-25).

### Temporary

`pages/applications/ApplicationsPage.tsx` is a hardcoded hello world — the section paints, and
nothing more — standing in until the real screen lands in Phase 3. Nothing in this repo touches the
host object, so what Phase 1 established about it is recorded in `progress.md` and `host-facts.md`
rather than exercised in code.

### Build wiring

- Vite: `root: assets/`, `base: './'`, unhashed entry `_static/main`, strict entry signatures (or
  the exports are dropped and the host imports an inert module), chunks and assets under `_static/`,
  react → `preact/compat` aliases plus `dedupe`, `@tailwindcss/vite`.
- `vp pack`: server `.ts` → per-file CJS into `build/resources/main`; `/lib/*` and `/apis/*`
  requires stay external; server tsconfig paths `/lib/graphql` → `types/graphql.d.ts`, `/apis/*`,
  `/lib/*`.
- Tests: `test.alias` maps `/lib/graphql` and `/lib/xp/i18n` to `src/test/mocks/`. Server code is
  linted and formatted with the rest.
- Gradle: `include xplibs.{admin,portal,io,i18n}` and `lib-graphql:3.0.0`; GraalJS pinned as the
  script engine; `systemApp = true`; `processResources` excludes `assets/js/**`, `assets/css/**`,
  `**/*.ts(x)`.
- `-Penv=dev` deploys with `X-Source-Paths`, so XP reads `src/main/resources` and
  `build/resources/main` live: `pnpm dev` (watch build) or `pnpm pack:server`, then reload. A
  descriptor or dependency change needs a redeploy.
- Size, production, on `@enonic/ui` 1.2.0 with `AppRoot` and a hello-world page: `main.js`
  297.2 kB / 88.4 kB gz, `main.css` 84.4 kB / 14.6 kB gz — the floor a section pays before it
  renders anything: `@enonic/ui` is not tree-shakeable, and Preact and the library are per provider
  by design.

## app-users

Not started. It mirrors app-applications with four descriptors — users, groups, roles, id-providers,
spaced `order` 20–23, each with its own `allow` — all pointing at one module: one shared controller
body in `lib/` that each `admin/extensions/<name>/<name>.ts` is two one-liners over, one schema
answering from every prefix, and a switch on which section a mount is, read off the end of
`host.baseUrl` (`<app>:<name>`) since `mount` is not told. The host imports one module for all of
an app's sections, so `mount` runs once per section from one instance: anything derived from `host`
must live per mount, never at module level. Copy `shared/{api,config,i18n,sections,styles}`, `lib/i18n.ts`,
`types/graphql.d.ts`, `src/test/mocks/`, the Vite and Gradle wiring and the `@enonic/ui` dependency
(`^1.2.0`); `shared/sections/contract.ts` stays byte-identical with the host's. The auth schema
moves per `docs.md` 4.2.

## Platform facts (verified against XP 8.1 source)

- An admin tool path is `/admin/<app>/<tool>`; a wrong base fails `verifyPathMountedOnAdminTool` with
  the misleading "API [admin:extension] is not mounted".
- Controller dispatch is `<METHOD>` → `<method>` → `all`, else 405. `request.body` is read for
  `text/*` and `application/json` before any handler runs.
- `AdminExtensionApiHandler`: the extension's `allow`, then the interface/mount check (skipped for
  interface `generic`), then `admin/extensions/<name>/<name>.js` with
  `contextPath = <toolBase>/_/admin:extension/<app>:<name>`.
- A universal API under a tool page resolves only if the host tool's descriptor lists it.
- A discovery row always has `config` (`{}`) and `interfaces` (`[]`); `title`/`description` are
  re-localized only when i18n keys are given, from `Accept-Language` against the provider's bundles;
  `iconUrl` falls back descriptor svg → application icon → XP's default.
- `allow` is tri-state: omitted = everyone past the tool, `[]` = admin only, listed = admin or listed.
- A GraalJS app serves text only; `.js` must be `text/javascript`.
- lib-graphql's `Json` scalar survives GraalJS; graphql-java rejects an object type with no fields at
  schema build and occupies `graphql/**` in the jar.
