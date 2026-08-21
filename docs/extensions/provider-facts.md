# Providers — how a section app is built

The provider counterpart to `host-facts.md`. What a `settings.section` provider ships and why,
written for the next app to follow — app-applications is the first, app-users is next, and nothing
here is specific to either. `docs.md` § 2 is the contract; this is what implementing it costs.

**Collected from phases 0 and 1 only.** One provider has been built against this; app-users is the
first test of whether it generalizes.

Read it with `host-facts.md` for the host's half, `progress.md` for what is still open, and
`../platform-facts.md`, which should absorb the XP facts at the end of this file.

## What a provider ships

```
admin/extensions/<name>/<name>.yaml    the descriptor XP discovers
admin/extensions/<name>/<name>.ts      the controller: GET statics, POST graphql
admin/extensions/<name>/<name>.svg     the rail icon
apis/graphql/request.ts                parse, execute, answer
apis/graphql/schema/{generator,index,query}.ts
apis/graphql/<domain>/<domain>.{types,fields}.ts
lib/i18n.ts                            phrase bundles, verbatim from the host
i18n/phrases.properties                descriptor phrases and the section's own
types/graphql.d.ts                     lib-graphql has no @enonic-types package
assets/css/index.css                   the section's own Tailwind build
assets/js/main.ts                      `mount` — the contract's entry
assets/js/app/                         App (the render gate), bootstrap, bootstrap.store
assets/js/pages/<section>/             the screen
assets/js/shared/{api,config,i18n,sections,styles}/
src/test/mocks/                        doubles for the XP libs the server code requires
```

A multi-section provider ships one descriptor per section, all pointing at the same module: the
browser executes it once, and only `mount()` runs per section.

## The descriptor

```yaml
kind: 'AdminExtension'
title:
  text: 'Applications'
  i18n: 'section.applications.title'
description:
  text: '…'
  i18n: 'section.applications.description'
allow:
  - 'role:system.admin'
interfaces:
  - 'settings.section'
config:
  order: 10 # spaced first-party weights; the shell sorts by (order, key)
  path: 'applications'
```

`title` and `description` are localized by the platform against this app's own bundle before the row
reaches the shell — the rail resolves no phrase of its own. `config` is **not** localized. `allow` is
tri-state and the whole access perimeter for the section: omitted = everyone who passed the host
tool, `[]` = `system.admin` only, populated = admin or listed.

## The controller

Two exports, no `all`:

```ts
export function get(request: Request): Response; // `_static/*` only, else 404
export function post(request: Request): Response; // `/graphql` only, else 404
```

Anything else answers **405 with no code written for it** — `ControllerScriptImpl` tries
`<METHOD>`, `<method>`, then `all`, and 405s when none is exported. The path below the prefix is
`request.rawPath.slice(request.contextPath.length)`.

Statics are served as text and nothing else: a GraalJS app cannot serve bytes at all (lib-static
answers with a `ByteSource`, which reaches the browser as a JSON map of its own method names).
`.js` must be `text/javascript` — Jetty gives `application/javascript` no charset and the serializer
throws.

## The data plane

`POST <prefix>/graphql`, not a `kind: API` descriptor. The reason is
`SlashApiHandler.verifyPathMountedOnAdminTool`: under `/admin/<app>/<tool>` a universal API resolves
only when the **host tool's** descriptor lists its key, so a provider's own API would 404 until
app-settings released a new descriptor naming it. The extension prefix is the one endpoint a provider
owns outright.

- **No role check in the handler.** Four gates already ran: `role:system.admin.login` on the
  dispatcher, the host tool's `allow`, the interface/mount check, and the extension's own `allow`.
  Re-requiring `role:system.admin` would lock out a provider whose descriptor allows a narrower
  audience — so the host's `adminOnly` wrapper is dropped on the way over.
- **Every root field is nullable**, for the reason in the host's `schema/query.ts`: one document
  carries several roots, and a non-null root would nullify its siblings' data on failure.
- `Query` may never be empty — graphql-java's `TypeAndFieldRule` rejects it at
  `GraphQLSchema.Builder.build()`, which runs at module load, so every request would 500.
- The schema is built once per module require, not per request.

Two roots every provider needs, because a section has no page of its own to inline config into:

| Root                            | Answers                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `config: Config`                | this app's own `app.name`, `app.version`, `app.config` values |
| `phrases(locale: String): Json` | `getAllPhrases` for the locale **the shell resolved**         |

The locale is asked for, never inferred, so the section is localized with the same locale as the host
chrome rather than with `Accept-Language`. `Json` survives GraalJS serialization — verified, so a map
travels as one field and needs no key/value pair type.

## The client

`mount` must answer with its disposer synchronously, so nothing in it may await:

```ts
export function mount({ container, host }: MountOptions): Unmount {
  adoptStyleSheet(container);
  void bootstrap(host);
  render(h(App, { host }), container);
  return () => render(null, container);
}
```

**Bootstrap is memoized for the life of the module, not the mount.** One document
(`requestGraphQlRoots(['config', 'phrases'])`), the locale as a variable, filling two stores. Safe to
memoize because the locale is the page's — a locale change reloads the page — and one schema answers
from all of a provider's prefixes, so every section would ask the same question. It also points the
transport at `<baseUrl>/graphql`, and catches rejections as well as `Result` errors: it is not
awaited, so an escaping rejection would leave the section on its skeleton for ever.

**The first render is gated on it.** `i18n()` resolves at call time and no component subscribes to
the phrase store, so anything rendered before the phrases land shows `#key#` and never recovers. `App`
reads a `{status, error?}` store and renders skeleton → failure → screen.

**A bootstrap failure cannot be localized** — the phrases are what failed to arrive — and it must be
the section's own message: the shell's failure means "the module would not load", which is a
different fault from "the module loaded and could not reach its own data".

Copied verbatim from the host, and destined for `@enonic/toolkit`: `shared/api/{errors,client}.ts`,
`shared/api/graphql.ts` (only its endpoint differs — a module value set by `setGraphQlEndpoint`
instead of a tool-config read), `shared/i18n/*`, `lib/i18n.ts`, `types/graphql.d.ts`,
`src/test/mocks/lib-graphql.ts`. Tests for those files stay in the host; only code that exists solely
here is tested here.

## Styling

The section owns its styling completely. `assets/css/index.css` imports Tailwind, `tw-animate-css`
and `@enonic/ui/preset.css`; the build emits it as `_static/main.css`; `shared/styles/stylesheet.ts`
fetches it back at module scope into one `CSSStyleSheet` and adopts it into whatever root it is
handed. The sheet is adopted while still empty, which is what keeps `mount` synchronous — the rules
appear a frame later, on a section's first mount only.

**The theme class goes on the section's own wrapper, not the document.** `@enonic/ui` resolves its
dark tokens from `.dark, :host(.dark)` and its `dark:` variants from `.dark, .dark *`, and neither
selector crosses a shadow boundary: once the preset is adopted inside the root, `:host` _sets_ the
light values on the section's host element instead of inheriting the host page's. So `App` wraps its
tree in `<div class={theme === 'dark' ? 'dark' : ''}>`, fed by `host.theme`. `AppRoot` should own this
once npm-enonic-ui#533 lands, or every provider carries the div.

Fonts come from the host: `@font-face` does not work inside a shadow root.

## Build wiring

`vite.config.ts`:

- `base: './'` and `input: { '_static/main': 'js/main.ts' }`, `entryFileNames: '[name].js'` — the
  host imports the contract-fixed `_static/main.js`, so the entry is unhashed.
- `preserveEntrySignatures: 'strict'`, or the entry's exports are dropped and the host imports an
  inert module.
- chunks and assets under `_static/`, or relative imports resolve above the prefix and 404.
- `resolve.alias` react/react-dom → `preact/compat`, `dedupe: ['preact', 'preact/compat']`.
- `pack.deps.neverBundle: [/^\/lib\//, /^\/apis\//]` — absolute requires stay external for XP to
  resolve; without the second pattern `import … from '/apis/graphql/request'` fails the pack.
- `test.alias` maps every `/lib/*` the server code requires to a double under `src/test/mocks/`.
- **Server code is linted and formatted**, `admin/**` included: oxlint resolves it against
  `src/main/resources/tsconfig.json`, which carries the XP globals and the absolute paths. The
  descriptor YAML gets single quotes as a consequence.

`src/main/resources/tsconfig.json` paths: `/lib/graphql` → `./types/graphql.d.ts` **above** the
`/lib/*` catch-all, and `/apis/*` → `./apis/*`. Root `tsconfig.json`: `src/test` in `include`, and
react/react-dom mapped to `preact/compat`.

`build.gradle`: `include xplibs.{admin,portal,io,i18n}` and
`include 'com.enonic.lib:lib-graphql:3.0.0'`; `scriptEngine = 'GraalJS'`; `processResources` excludes
`assets/js/**`, `assets/css/**`, `**/*.ts`, `**/*.tsx`.

**Do not put the schema in `graphql/`.** graphql-java unpacks its own `graphql.schema` package to that
jar path, so an app's modules land inside a shipped library's package directory. `apis/graphql/` is
collision-free and mirrors the host's tree, which makes moving a schema over a copy with every
internal import unchanged.

## Numbers

A section's floor, production build, measured on the first provider:

|                    | raw      | gzip        |
| ------------------ | -------- | ----------- |
| `_static/main.js`  | 292.8 kB | **86.7 kB** |
| `_static/main.css` | 70.8 kB  | **12.5 kB** |

Without `@enonic/ui` it was 27.7 kB / 10.3 kB gz. The difference is the library, not the import:
`@enonic/ui` ships one bundled `enonic-ui.es.js` with **no `sideEffects: false`** and no subpath
exports, so importing one component pulls react-virtuoso, focus-trap-react, Radix and every other
component. Preact and the library are per-provider by design, so this repeats in each. Worth raising
with npm-enonic-ui alongside #533.

## Chores the next provider should not repeat

- `Cache-Control` on `_static/*` — nothing is set, so every visit re-downloads the module and its
  stylesheet in full. `immutable` for hashed chunks, revalidated for `main.js`.
- `systemApp = true` makes the app un-uninstallable, which blocks proving that a section leaving the
  rail unmounts. Set it false while the lifecycle work is unproven.
- `.DS_Store` in `.gitignore` and in the `processResources` excludes.
- Bootstrap has no retry. Fine for a harness; a real section wants one.

## Platform facts this relies on

Verified against XP 8.1 source and a live spike. These belong in `../platform-facts.md`.

- An admin tool path is `/admin/<app>/<tool>` — **no `/tool/` segment**
  (`PathMatchers.ADMIN_TOOL_PATH_PATTERN`, `AdminLibHelper`). A wrong base makes
  `verifyPathMountedOnAdminTool` fail with the misleading _"API [admin:extension] is not mounted"_.
- An extension controller is an ordinary controller script: method dispatch is
  `<METHOD>` → `<method>` → `all`, then 405.
- `request.body` is populated before any handler runs — `WebDispatcherServlet` →
  `RequestBodyReader`, which reads `text/*` and `application/json` only. Nothing to opt into per
  endpoint.
- `AdminExtensionApiHandler` applies the extension's `allow` and the interface/mount check before the
  script runs, and sets `contextPath` to `<toolBase>/_/admin:extension/<app>:<name>`.
- A universal API is reachable from an admin tool page only if the host tool's descriptor lists it
  (`SlashApiHandler.verifyPathMountedOnAdminTool`).
- `lib/graphql`'s `Json` scalar survives GraalJS serialization.
- graphql-java occupies `graphql/**` in the jar root.
- graphql-java rejects an object type with no fields, at schema build.
