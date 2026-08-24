# Host facts — the shell that hosts sections

What app-settings does as the **host**, and why, where `docs.md` could not know it in advance.
Its counterpart is `provider-facts.md`, which covers the app on the other side of the boundary.
`progress.md` tracks what is built and what is left; nothing here is a status.

**Collected from phases 0 and 1 only.** Phases 2–5 have not run, so nothing below has been tested
against a second provider, an extracted component kit, or a real section moving out.

## What the host owns

| Path                         | What it is                                                              |
| ---------------------------- | ----------------------------------------------------------------------- |
| `admin/tools/main/main.yaml` | publishes `interfaces: [settings.section]` and mounts `admin:extension` |
| `lib/config.ts`              | `apis.extensions` — the discovery endpoint                              |
| `entities/extension/`        | discovery: fetch, map, sort, slugs                                      |
| `app/SectionRoute.tsx`       | what the `$slug` route renders                                          |
| `app/createSectionHost.ts`   | the `Host` object, one per section                                      |
| `app/useSectionRedirect.ts`  | an unanswered path goes to the first section                            |
| `widgets/section-mount/`     | the shadow host element and the failure phrase                          |
| `shared/sections/`           | the contract, `mountSection` and its DOM helpers, the sub-path helpers  |

The five built-in sections are **commented out, not deleted**: `app/router.tsx`, `app/App.tsx` and
`app/AppShell.tsx` each carry a `// TODO: [extensions]` marker, and `pages/**` is excluded from lint
while it is dormant — it no longer type-checks, because the router registers none of its routes.

## The contract

- **It lives at `shared/sections/contract.ts` in both repos** — the same path, so the two copies are
  easy to diff. Below the header comment they are byte-identical. Its eventual home is the
  `@enonic/toolkit/section` subpath.
- **No version handshake.** The scratch spike exported a `contractVersion`; it is gone. A module
  without a `mount` function is the only thing the host rejects.
- **`baseUrl` is a convenience, not a necessity.** A guest can resolve its own endpoint from
  `import.meta.url`, as its stylesheet already does. Handing it over keeps the data plane independent
  of where the build puts assets — worth knowing before Phase 2 freezes the contract.
- **There are two section failure modes, not one.** The module would not load (the host's, reported as
  `sectionMount.failed`), and the module loaded but could not reach its own data (the guest's, in its
  own column). `docs.md` § Lifecycle assumes only the first.

## Discovery and the rail

- **Slugs are assigned after sorting.** `config.path` is taken where it is a single safe segment and
  unclaimed; otherwise the descriptor key stands in, with a warning. Sorting is `(order ?? 1000, key)`
  — the key breaks ties because a localized title is neither stable nor unique.
- **Titles arrive localized.** The platform resolves `title`/`description` against the owning app's own
  bundle, so the rail resolves no phrase for a section. `config` is not localized.
- **Rail icons are tinted, not drawn.** The platform serves them as images, and an svg drawn in
  `currentColor` goes black inside an `img`, so the rail paints them as a CSS mask over the foreground
  colour. A provider shipping a colour logo would be flattened.

## Mounting

- **The mount sequence is one tested unit.** `mountSection` owns preload-free loading: open the shadow
  root, import with a 15 s timeout, guard the module, mount, and hand back an idempotent disposer. Its
  browser dependencies are injectable, which is what makes ten tests possible in a `node` environment.
- **Failure names its stage in the console, not on screen.** One phrase (`sectionMount.failed`) for the
  operator; `Section <url> could not be imported | exports no mount function | threw while mounting`
  for whoever is debugging across two repos.
- **Styling is entirely the guest's.** It emits `_static/main.css`, fetches it back at module scope
  into one `CSSStyleSheet`, and adopts it into whatever root it is handed — so the host knows exactly
  one contract-fixed path, `_static/main.js`. A host-side `<link rel="preload">` for the stylesheet was
  built and then removed: preload reuse is keyed on request destination, so an `as="style"` hint is not
  reused by the guest's `fetch`, and it gave the host knowledge of a guest file name for no gain.
- **The section host element stays mounted in every state.** Rendering a message instead of it drops
  the ref, and nothing can mount afterwards.

## Routing

The router uses `createHashHistory()`, as an XP admin tool should — `docs.md` § Routing says
"real history". One consequence: **anchor-click interception is unnecessary**, because
`href="#/applications/x"` routes itself.

## Data and events

- **A section's data plane is its own endpoint, not a `kind: API`.** Under an admin tool path a
  universal API resolves only when the _host tool's_ descriptor names it, so any other choice would
  cost an app-settings release per provider. The host stays uninvolved: it hands over `baseUrl` and
  never sees a query.
- **Config and phrases reach a guest after mount, not before.** A section has no page of its own to
  inline a JSON island into, and its server code runs only when its endpoint is asked. Two
  consequences the design did not anticipate: the guest must gate its first render, and **a bootstrap
  failure cannot be localized** — the phrases are what failed to arrive.
- **Notification ids are shared across mounts.** `notify` dedups on tone and text and returns the
  _existing_ id, so revoking a mount's toasts needs an owner tag first, or one section dismisses
  another's.

## Numbers

A section's floor, production build, measured on the first provider: **~87 kB gz JS + ~12.5 kB gz
CSS**, duplicated per provider because neither Preact nor `@enonic/ui` is shared. The library is what
dominates it — see `provider-facts.md` § Numbers.
