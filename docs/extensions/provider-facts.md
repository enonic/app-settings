# Provider facts — the apps that ship sections

A provider ships one `AdminExtension` per section on `settings.section` and serves everything under
its own extension prefix. `docs.md` § 2 is the contract; this is what implementing it looks like, per
provider, read off `app-applications` `extensions` and `app-users` `extensions`. `host-facts.md` is
the other side. The platform facts the providers verified are in `../platform-facts.md` § Admin
extensions.

## What every provider does

- `admin/extensions/<name>/` per section: `<name>.yaml` (`order`, `path`, its own `allow`),
  `<name>.svg` (the rail icon), `<name>.ts` (the controller). The controller owns the prefix: `get`
  serves `_static/*` as text (`text/javascript`, `text/css`), `post` hands `/graphql` to
  lib-graphql, anything else is a 404.
- `apis/graphql/` (app-applications) or `extensions/graphql/` (app-users): the section's schema,
  built once per module require, every root nullable, no role check — the four platform gates already
  ran. Roots `config` and `phrases(locale): Json` carry client config and the phrases for
  `host.locale`. Not under `graphql/`, which graphql-java occupies in the jar.
- `assets/js/main.ts` exports `mount({container, host})`: it starts the bootstrap without awaiting
  it, renders `App`, and hands back the unmount synchronously. `App` gates on the bootstrap:
  skeleton → failure → screen.
- `App` renders inside `@enonic/ui`'s `AppRoot` with `theme` read off `host.theme` (`get()` first,
  then `subscribe`) and `stylesheets` from `shared/styles`: the sheet is `_static/main.css` fetched
  into one `CSSStyleSheet` per module, adopted into the shadow root. Fonts come from the host.
- `shared/{api,config,i18n,sections}` were copied from the host when the sections moved, and
  `widgets/`, `shared/ui` and the rest of `shared/` with them. **Those copies are now canonical** —
  the host deleted its own in Phase 5.1 — and are being resynced to one form between the two
  providers before `@enonic/ui-kit` extracts them. `shared/sections/contract.ts` stays byte-identical
  with the host's until `@enonic/ui-types` publishes it.
- Events: the section subscribes the hub itself through `shared/admin-events`, with the topic names
  it needs copied from the table in `docs.md` § Events into `shared/admin-events/topics.ts`. No event
  code on the server. A loss means refetch.
- Build: Vite with `root: assets/`, `base: './'`, unhashed entry `_static/main`, strict entry
  signatures (or the exports are dropped and the host imports an inert module), chunks and assets
  under `_static/`, react → `preact/compat` aliases plus `dedupe`, `@tailwindcss/vite`. `vp pack`
  emits the server `.ts` per file into `build/resources/main`. Gradle: `include xplibs.{admin,portal,
io,i18n}` and `lib-graphql:3.0.0`, GraalJS pinned, `processResources` excludes the sources.
- `-Penv=dev` deploys with `X-Source-Paths`, so XP reads `src/main/resources` and
  `build/resources/main` live: `pnpm dev` or `pnpm pack:server`, then reload. A descriptor or
  dependency change needs a redeploy.
- Cost, before a section renders anything of its own: about 88 kB gz of JS and 15 kB gz of CSS.
  `@enonic/ui` is not tree-shakeable, and Preact and the library are per provider by design.

## Module and mount

The host imports one module for all of an application's sections and calls `mount` once per section
from that one instance, so a provider has two levels of life, and everything it holds lives on
exactly one of them:

- **Module level, one per application**: Preact, the parsed stylesheet, phrases and config, the hub
  connection, the domain stores and the services that keep them fresh on events, the GraphQL
  endpoint (every prefix of an app serves the same schema, so the first mount's `baseUrl` sets it).
  Module code never reads `host`: there are as many as there are sections.
- **Mount level, one per section**: everything derived from `host` — the sub-path and the selected
  item, `navigate`, `notify`, the theme — and the screen's own state. app-users builds a
  `HostFrame` per mount (`shared/host/frame.ts`: `$itemId`, `$visible` off `host.visible`, `openItem`, `closeItem`,
  `notify(level, message)`, `dispose`) and hands it down through a context, the one context in an
  app of stores. Commands never touch the host: they return outcomes for the dialog holding the frame
  to toast (app-users), or take that frame's `notify` as an argument (app-applications).
- Which section a mount is comes off the last segment of `host.baseUrl`, the extension key
  `<app>:<name>` (`app/section.ts` in app-users). `mount` is told nothing else.
- Event reaction splits the same way: refreshing a cache is the module's, "the item you have open
  was deleted elsewhere — close it and say so" is the mount's, because it needs that section's
  `closeItem` and `notify`.

A single section is the degenerate case of this shape, not a different one. app-applications was
built before the shape settled and held the host in module state (`setHost/getHost`, one `$path`,
commands that notified themselves) until app-applications#2322 brought it to the same frame, so that
the toolkit's section runtime is extracted from two identical implementations.

## Contributing a CSP source

A section's own resources are same-origin, so the host baseline (`host-facts.md`) already covers
them: a provider needs nothing here unless it loads something genuinely remote. When it does, the
channel is XP's `AdminExtensionResponseProcessor` — a Java OSGi service in the provider's jar,
`property = "key=<app>:<extension>"`, run by the platform after the host's tool controller and only
for a caller who passes that extension's `allow`. It extends the same request-scoped policy the host
seeded, and the platform unions the contributions into one header.

**The invariant, and it is not optional: extend a directive that is already there, never create
one.** A processor that sets `img-src <host>` on a request carrying no policy produces a page whose
only allowed images are that host's — every same-origin image blocked. It is also what makes the
host's `contentSecurityPolicy.enabled=false` switch turn off the whole chain instead of leaving
half-policies behind. So guard on `policy.directive(CspDirective.IMG_SRC).isPresent()` before
adding, and keep to additive methods — `override`, `reset`, `resetTo` and `addPolicy` are reachable
but replace the host's work.

Which means a directive the host does not name is one no section can open: the host closes only
`form-action`, which has no `default-src` fallback, and leaves `object-src`, `frame-src`,
`media-src` and the rest denied by `default-src 'none'`. A section that genuinely needs one of them
is a conversation with the host, not something a processor can add.

Worked example: `../app-applications` `csp/ApplicationsSectionCspProcessor`, which opens `img-src`
for the market origin its icons come from, derived from the app's own `marketApiUrl` config so a
self-hosted market moves with it.

## app-applications

One section, `applications` (`order: 10`, `allow: role:system.admin`). Its schema serves the
applications list, Enonic Market and the install flow; core api urls it needs (`server:app`) are
built by its own controller with `portal.apiUrl` and answered on the `config` root as
`serverAppUrl` — a request to an extension keeps the hosting tool's `baseUri`, so the url anchors at
the host page. It subscribes the hub's `applications` and `application-progress` topics. Jar upload
is the one `XMLHttpRequest` in the two providers, kept for progress events.

## app-users

Four sections, `users`, `groups`, `roles`, `id-providers` (`order` 20–23, each with its own
`allow`), one module. One controller body in `extensions/endpoint.ts` that each
`admin/extensions/<name>/<name>.ts` re-exports; one schema answering from every prefix. The
principals GraphQL layer and the `lib/auth/**` java beans moved here from the host with #2639;
`docs/unified-api.md` there is its design. It subscribes the hub's `principals` topic, keyed by
section, so one section's stop does not silence the others.
