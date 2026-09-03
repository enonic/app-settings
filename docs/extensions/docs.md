# Extensions

app-settings becomes a **shell** that discovers and hosts sections other apps provide. The
Applications section moves back into app-applications, and Users/Groups/Roles/ID Providers move
back into app-users — the existing applications, whose admin UI gets rewritten in the process.
Each of those apps ships its sections as XP admin extensions on the `settings.section` interface,
which the shell discovers at runtime. After cutover the extension is the **only** entry point to a
section — the old admin tools go, and no new standalone tools replace them.

A scope note: **third-party providers are possible by construction, but not expected.** The
planned providers are our own apps — applications, users, a license app later. Where this document
accounts for unknown third-party sections (isolation, event forwarding), it does so to keep the
architecture and its security properties honest, not because external admin apps are a product
goal.

The decisions below are agreed; the watch list at the end tracks the risks that remain.

---

## 1. Decisions

### The boundary

- **Host and providers are separate applications** — separate jars, separate builds, separate
  server-side script contexts. Nothing is shared at build time except, from Phase 2, the npm
  package carrying the component kit and the contract types. At runtime the boundary is crossed by
  a discovery row (JSON), a module URL, and the host object handed to `mount`.
- **The provider owns the section's content area.** The host owns the app bar, section rail,
  theme, notifications, the event socket and the URL. It knows nothing about what a section renders.
- **The host owns the page's `Content-Security-Policy`**, seeded as a strict baseline at render time
  — but it never names another app's hosts. A section needing a remote source contributes it itself
  through XP's `AdminExtensionResponseProcessor`, and the platform unions the contributions into one
  header. The invariant on that side: **extend a directive the host declared, never create one** —
  creating `img-src <host>` alone blocks every same-origin image on the page, and it is what keeps
  the host's kill switch meaningful. Details in `host-facts.md` and `provider-facts.md`.
- **Preact is not shared.** Each provider bundles its own. Visual consistency comes from the shared
  component kit, not a shared runtime.
- No module federation, no iframes, no fetched-HTML injection.

Rejected alternatives, for the record: an **iframe** — XP sets `X-Frame-Options: DENY` on every
response via a global web filter (no per-descriptor override, only an operator config change), and
a same-origin iframe is not a security boundary anyway (`parent.document` is reachable); and
**Content Studio's menuitem pattern** (fetch an HTML fragment, sanitize, hoist its scripts and
links into `document.head`) — zero isolation and a documented trail of bugs, all consequences of
the contract being "HTML whose scripts must find themselves in a foreign document". The mount
contract removes that root cause: the host hands the guest a container; the guest never searches
for itself.

**The component kit**, referenced throughout: the npm packages extracted from the providers in
Phase 2 — the browse framework (`browse-layout`, `browse-list`, `browse-toolbar`, `browse-search`,
`details-panel`), dialog and form shells, the GraphQL transport, format helpers and the i18n hook.
It sits on top of `@enonic/ui` (base components: buttons, dialogs, selects) and is what makes a
section a section. Since the runtime is not shared, the kit is the only mechanism by which sections
from different providers look and behave the same: every provider depends on it at build time and
compiles it into its own bundle. **It is the `npm-enonic-ui-toolkit` repository, a standalone
monorepo publishing four packages like `@enonic/ui` does one** — app-settings and Content Studio are
both consumers, neither owns it: `@enonic/ui-types` (types only; the mount contract lands here),
`@enonic/ui-utils` (transport, format, i18n core — no view layer), `@enonic/ui-kit` (the browse
framework, dialog shells, the section runtime) and `@enonic/input-types` (XP input types as
components). The host consumes only `ui-types`; the providers consume all but `input-types` until a
form needs it. Content Studio v6 solves the same browse-screen problem with the same widgets and is
the kit's likely third consumer.

Two of the kit's pieces are mechanisms rather than components, and they travel with a reason. The
**i18n slice** (`useI18n` hook + phrase store) is mechanism only — phrases always come from the
consumer: a section feeds it the phrases fetched from its own schema root field. Every provider
compiles the kit into its own bundle, so the phrase store is per-provider by construction. The
identical hook already exists in Content Studio v6; this is the extraction of an existing
duplicate, not new surface. The **GraphQL transport** builds documents from parts so that values
travel only as JSON variables and never enter the document text — an injection-safety invariant
worth having in one audited copy instead of one copy per provider. On the move it stops reading the
app config and takes its base URL from `host.baseUrl`. Not moving with it: `upload.ts` (the one
XHR multipart helper) is Applications-specific and goes to app-applications in Phase 3.

Dependency policy, with `@enonic/ui`'s own manifest as the precedent: **peer** for what must exist
once per bundle or appears in public signatures — `preact` (+ `react` aliased to `preact/compat`),
`@enonic/ui` with its floor at the shadow-capable version, `neverthrow` (`Result` is in every
transport signature); **regular dependency** for internals that tolerate copies — `nanostores`
(structural `{get, subscribe}` objects with no shared identity, the same property that lets the
contract avoid naming it) and `lucide-react`. `@enonic/ui` is a peer for a hard reason:
`PortalProvider` is a Preact context, and a context created in one copy of the package is invisible
to components from another — two copies means overlays silently lose their layer.

### Discovery and mounting

1. Provider ships one extension **per section**: `admin/extensions/<name>/` — descriptor
   (`kind: AdminExtension`, `interfaces: ["settings.section"]`, `allow`,
   `config: {order, path, module}`), controller, and `<name>.svg` (the rail icon). A
   multi-section provider like app-users ships four descriptors backed by the same module: the host
   groups an app's rows and imports the first one's entry url for all of them, so the browser
   executes the module once, module-level state is shared, and only `mount()` runs per section.
   `config.module` names a sharing group within the app and is the opt-out — sections naming
   different values keep separate modules. Grouping never crosses an application, and the canonical
   row comes from the caller's own principal-filtered discovery, so its url is always readable.
2. Host tool descriptor declares `interfaces: ["settings.section"]` and mounts
   `apis: ["admin:extension", "admin:events"]`, plus the core APIs sections need — today
   `server:app` for application lifecycle (see Data, core API mounts).
3. Host asks `GET <extensionApi>?interface=settings.section` → rows of
   `{key, title, description, iconUrl, url, interfaces, config}` — **title localized by the
   platform** against the owning app's bundle, list pre-filtered by the caller's principals.
   `url`/`iconUrl` are relative to the API endpoint; concatenate.
4. Rail order: sort by `(config.order ?? 1000, key)` — deterministic, insert-stable when apps come
   and go. First-party apps use spaced weights (applications 10, the four user sections 20–23,
   license 30…).
5. `<extensionApi>/<app>:<name>` is a URL prefix the provider owns completely. The host imports
   the module entry from the contract-fixed path under it — `await import(prefix + '/_static/main.js')`.
   The entry name is stable (unhashed) so the host never needs a lookup; hashed chunks sit beside
   it and resolve relatively, and the stylesheet is an unhashed `_static/main.css` the guest
   resolves relative to its module url. The host calls `mount(...)`; the returned unmount runs when
   the section leaves the rail (its app is uninstalled or stopped), not on section switching — see
   Lifecycle.
6. The rail reacts to application server events (installed/started/stopped/uninstalled) by
   re-running discovery — including the case where the Applications section uninstalls the app whose
   section the user is standing in, or itself.

### Isolation and CSS — shadow DOM

**Each mount gets its own shadow root.** The host creates `host element → shadowRoot → container`
and passes the container. Guest CSS (own Tailwind build, own `@enonic/ui`, preflight **on**) is
attached inside the root via `adoptedStyleSheets`; the guest constructs its `CSSStyleSheet` once at
module level, so remounts and a multi-section provider's other sections reuse the parsed sheet
instead of re-parsing CSS.

**Condition attached to this decision: `@enonic/ui` gets a shadow-DOM workstream in parallel**
(section 3). The library is ours (`npm-enonic-ui`), which is what makes this affordable. Fallback if
the Phase 1.2 spike hits an unexpected blocker: light DOM — preflight off in guest builds, theme
tokens, narrow peer-range on the kit.

What the decision buys, said plainly: **isolation by construction instead of isolation by
discipline.** Preflight and utilities are locked inside the root with no rules imposed on guest
builds; version pinning across providers is unnecessary — guests upgrade the kit at their own
pace; a third-party extension with arbitrary CSS cannot break the page or other sections.

What it does **not** remove:

- **Fonts** — `@font-face` does not work inside a shadow root. The host guarantees the font at
  document level; guests do not ship fonts.
- **Theme tokens** — CSS custom properties inherit through the shadow boundary; the host owns
  `:root` token values and the theme toggle; guest palettes reference the tokens. Instant,
  flicker-free switching falls out of centralizing values, with rules decentralized.
- **Inheritance leak** — inheritable properties (`font-family`, `color`, `line-height`) flow from
  the host's `body` into the root. `@enonic/ui`'s `AppRoot` component applies a `:host` reset once,
  instead of every guest carrying a rule.
- **Z-band** — section overlays live inside the section's root; host chrome (toasts, app bar)
  reserves the top z-index band so it always stacks above.
- **E2E friction** — WebdriverIO needs deep/shadow selectors. Test cost, not product cost.

### Data

- **Each provider owns its GraphQL layer**, served as `POST /graphql` under its extension
  prefix — a multi-section provider serves one schema from all of its prefixes. Same origin, so the
  session cookie rides along, and the extension's `allow` gate covers UI and data alike.
- The host mounts none of the provider's APIs (an `AdminExtension` descriptor has **no `apis`
  field**, and XP checks universal-API mounts against the _host tool's_ descriptor — it cannot
  enumerate unknown apps). Everything app-specific goes through the extension prefix.
- **Known, accepted limitation — core API mounts.** A core platform API a section calls from the
  hub page (application lifecycle on `server:app` being the case today) must be listed in the
  _host tool's_ `apis:` — XP checks the mount against the page, not the caller — so that list is the
  only allow-list there is. The **url** is the provider's own answer, though: a request to an
  extension keeps the hosting tool's `baseUri`, so `portal.apiUrl` in the provider's controller
  builds exactly the url the host would have, and nothing about core APIs crosses the contract. If a
  section ever needs another core API, the host list grows and the host is released — accepted for a
  first-party set. Providers proxy through their own prefix where that is cheap (upload _reception_
  works in GraalJS); per-extension api mounts remain worth raising with the platform team as a future
  improvement.
- Client config and phrases: root fields on the provider's own GraphQL schema (or a JSON endpoint
  under the prefix for phrases). The controller runs in the provider's app context — `app.config`
  and its own `phrases.properties` via lib-i18n work. The section requests phrases for
  `host.locale` explicitly (a query variable), so it is localized with the same locale as the host
  chrome, not with whatever the browser put in `Accept-Language`.
- Locale change is a page-level reload, as elsewhere in the XP admin. No hot language switching in
  the contract.

### Events

- **The admin events hub** (`admin:events`, XP #12253) carries every event that crosses this
  boundary. A publisher registers a topic with `setTopic({name, allow})` from `/lib/xp/admin` and
  publishes with `sendToTopic` off a server-side listener; a topic's `allow` is enforced by the hub
  per subscriber, so events stopped being a broadcast (#42 E1 is closed by construction). The old
  `admin:event` socket is not mounted on the tool any more.
- **The host owns every topic.** It alone listens to the XP events that matter to the container
  (`lib/events/`: application lifecycle, principal nodes), registers one topic per domain with
  that domain's `allow`, and publishes minimal payloads. A provider ships no event code at all —
  no `setTopic`, no listener, no `main.js` — so a section's audience and its event feed are gated
  in one place, by the app that already gates the tool.
- **Sections are subscribers only, the menu in app-admin-home being the pattern**: the section's
  own `config` root field hands it `eventsUrl` (`portal.apiUrl({api: 'admin:events'})`), its client
  imports `${eventsUrl}/client.js` and calls `connect({onEvent, onLoss}).subscribe(topic)` with the
  canonical topic name, copied from the table below into the provider's own
  `shared/admin-events/topics.ts`. The table is the source of truth; the names are the host's and
  are not part of the mount contract, so `@enonic/ui-types` never carries them. Nothing crosses the
  host object: the contract carries no event member. The platform's client rides a shared worker keyed by its
  url, so the shell, the menu and every section share one socket per browser anyway.
- A subscription outlives a revoked mount (the platform client's `connect` facade has no
  unsubscribe), and the hub's topics outlive any provider — so a dead section's handler keeps
  hearing messages until the page reloads. Accepted: the payloads are ids a stale handler can do
  nothing with.
- **Loss is a signal, not a gap to ignore**: the hub client counts missed messages per topic
  (`onLoss`, `null` across an epoch change), and the usual answer is a refetch — the rail
  rediscovers on it, which also covers reconnects.
- **Security note:** a topic's payload still reaches every principal its `allow` admits — carry
  IDs, re-read data through the section's own gateway where the data-plane `allow` applies.
- The topics, all owned by the host (canonical prefix `com.enonic.xp.app.settings:`):

  | Topic                  | `allow` (besides `system.admin`) | Published on                                  | Payload                                                                 |
  | ---------------------- | -------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
  | `applications`         | —                                | application lifecycle                         | `{eventType, key, systemApplication}`                                   |
  | `application-progress` | —                                | `PROGRESS`, once per percent of a download    | `{url, percent}`                                                        |
  | `principals`           | `user.admin`, `user.app`         | `node.*` of the system repo under `/identity` | `{operation, changes: [{kind, key}]}`, kinds user/group/role/idProvider |

  **Install progress has a topic of its own, not a row on `applications`.** Sequence numbers and
  `onLoss` are per topic, so a hundred percent-messages sharing the lifecycle stream would make a
  dropped percent indistinguishable from a dropped `INSTALLED` — the rail would rediscover and the
  market catalogue would reload, a call out to Enonic Market, for nothing. The shapes are unrelated
  too, and three subscribers of `applications` would parse every percent to discard it. The hub's
  listener is that event's only route to a browser: `server:app`'s SSE does **not** carry it
  (`platform-facts.md`).

  It is passed through unsmoothed — no throttling, and no terminal message. Core publishes only
  when the percent moves, and 100% means the download finished rather than the install, so ending a
  bar is the caller's own business: app-applications clears the row when its `installUrl` request
  resolves, and the `applications` topic only drives the catalogue reload behind it. `percent` stays
  0 for a download core has no content length to measure. The payload's `url` is the one place a
  topic carries data rather than an id, because it is the only handle core reports a download by.

  The rail's rediscovery rides `applications` too; its admin-only `allow` means a delegated
  operator's rail is static until reload — accepted until a broader topic is warranted.

### Notifications

- One toast stack, owned by the host; guests call `host.notify`. Rendering toasts inside a section
  is ruled out: they would clip against the section's shadow root and column, and stacks would
  compete on section switches.
- `message` arrives **already localized** by the guest; no i18n keys cross the boundary.
- Shape: `{level, message, autoClose?}`. Dedup, stacking and `aria-live` are done once, host-side.
  An `action` member (the "Deleted — Undo" pattern) was in v1 and removed unused before the contract
  was published; it returns additively when a section asks for it.
- A hidden section may notify — with keep-alive its mount and host object stay live, so
  "install finished while you were in Users" produces a toast. Only real unmount (the app leaving
  the rail) revokes the host object and ends delivery.

### Routing

- Host owns the URL — hash history through TanStack Router, one splat route template
  `$slug/$`. Guests **never** touch `window.history`/`location`.
- `path` on the host object is a subscription and includes search params; back/forward arrive
  through it. Upstream: `host.navigate(subPath, {replace?})`.
- Slug from `config.path`; key is the identity, path is cosmetic; on collision the loser (by
  `(order, key)` — deterministic) falls back to its full key as segment, with a warning.
- Deep link before discovery resolves: hold the pending path, resolve after; unknown section →
  redirect to the first available, silently.
- Host remembers the last subPath per section and restores it on return; clicking the active rail
  icon resets to the section root. `document.title` is set by the host from the section title.

### Lifecycle

- **Keep-alive on section switch.** A section mounts on first visit; switching away hides its
  host element, switching back shows it — the DOM, scroll position, expanded rows and a
  half-filled dialog are exactly where the user left them. Unmount runs only when the section
  leaves the rail (its app is uninstalled or stopped).
- Hidden sections stay live: their subscriptions keep firing, so they stay fresh and may `notify`.
  This is the accepted cost of keep-alive (see the watch list). `host.visible` tells a section when it
  is hidden, so it can pause what only a viewer needs — measuring, polling — and resume on return.
- **The switch policy is host-side and contract-free.** `mount`/unmount expresses both worlds:
  guests must survive unmount regardless (uninstall already forces that path), so if DOM
  accumulation ever hurts, the host moves to unmount-on-switch without touching a provider.
- The host wraps import + mount in an error boundary with an import timeout, names the failed stage
  in the console (could not be imported, exports no `mount`, threw while mounting) behind one phrase
  on screen, and **keeps the section host element mounted in every state** (spike lesson: rendering
  an error instead drops the ref and nothing can mount afterwards). There is no host-side skeleton:
  the guest's own is what shows between import and its first paint, and a module that loaded but
  cannot reach its data is the guest's failure to render.
- `unmount` is idempotent and must not throw; the host wraps it anyway. Shadow root teardown makes
  style cleanup automatic — nothing of the guest's ever entered `document.head`.
- **At unmount the host revokes that mount's host object**: event and store subscriptions handed to
  the mount are dropped, and `navigate`/`notify` calls from a stale reference become no-ops.

### Contract ownership, distribution, versioning

- **The host owns the contract** and the `settings.*` interface namespace; providers follow.
- **v1: types are duplicated in every repo**, byte-identical, until `@enonic/ui-types` publishes
  them as its first contract: the **generic** host↔mount contract (`mount`, `Host`, `Routed`,
  `Readable`), with nothing hub-specific in it beyond `SectionHost` naming what `settings.section`
  hands over. Interface names (`settings.section`) and the hub's topic names are
  not exported — they live in documentation and in descriptors, so the package stays hub-agnostic and
  Content Studio can adopt the same contract with its own interface name and an extended host
  object.
- `mount({container, host})` — object argument, extendable without breaking anyone.
- **No runtime contract versioning.** A `contractVersion` handshake was considered and dropped as
  overkill: every provider is ours, so a contract change ships as a coordinated release of host
  and providers. If a provider we do not control ever appears, versioning comes back as a **new
  interface name** (`settings.section.v2`) — incompatible guests are then simply not discovered,
  which the platform itself enforces — not as a runtime check.
- The object argument keeps the contract **additively extendable**: a new optional host-object
  member breaks nobody. Ideas parked here, none likely while the providers are 2–3 internal apps:
  host-owned confirms/dialogs, wizard-level `document.title`, a busy/progress signal.

### Security and access

- **No same-origin mechanism isolates guest JS** — guest code runs with the host page's session
  and realm. The security model is XP's trust-on-install (only `system.admin` installs apps) plus
  per-extension `allow` gates; shadow DOM isolation buys robustness, not protection from malicious
  code.
- Four independent server-side gates on every extension request, all platform-enforced:
  `role:system.admin.login` on the dispatcher → the host tool's `allow` → the interface/mount
  check → the extension's own `allow` (also applied to the discovery list, so menu and access
  agree).
- **The host tool's `allow` is the union of the section audiences** — today
  `role:system.admin` + `role:system.user.admin` + `role:system.user.app` (`system.admin` passes
  `isAccessAllowed` unconditionally anyway) — and means only "may open Settings". Which sections a
  caller sees is still each extension's own `allow`, filtered server-side. The floor
  (`role:system.admin.login`) was tried and reverted: it put the Settings tool in the admin menu for
  every principal who can log into admin, section or no section. The accepted cost of the union is
  coupling — a provider introducing a new audience role needs this descriptor extended, i.e. a host
  release. The empty-rail state (§ 5.2) still matters: a listed role with its provider not yet
  installed lands on an empty rail.
- **Inaccessible sections are absent, not disabled.** The rail renders exactly what the filtered
  discovery list returns: an operator with `role:system.user.admin` and no admin role does not see
  Applications at all — no greyed-out items, nothing to probe. The menu and the access decision
  cannot disagree, because they are the same server-side check.
- The dispatcher's `role:system.admin.login` floor means a section cannot be offered to a
  principal without admin-login rights. If that is ever needed, it is a platform ask, not an app
  workaround.
- The extension is the only entry point to a section (no standalone tools after cutover), so the
  extension's `allow` is the **entire** access perimeter per section.

### Repositories

- **The existing repositories stay**: app-applications and app-users get the rewritten UI as their
  next version — issues, history, app keys and Market identity survive. New repositories were
  considered and rejected: they would double the app keys for the same function and raise an
  installation-migration question with no offsetting benefit.

### Platform facts (verified, not negotiable)

Verified against XP 8.1 source and a live spike:

- **A GraalJS app can serve no bytes** — extension endpoints are text-only (JS/CSS/SVG fine,
  nothing binary). Receiving bytes (upload) works; serving them does not.
- `text/javascript`, not `application/javascript` — Jetty gives the latter no charset and the
  serializer throws.
- `preserveEntrySignatures: 'strict'` in the provider's Vite config, or the entry's exports are
  dropped and the host imports an inert module.
- Chunks/CSS under `_static/`, or relative imports resolve above the prefix and 404.
- The host's section container must stay mounted in every state.
- Extension endpoints cannot serve websockets: the platform accepts the handshake but never
  delivers socket events to an extension controller.
- `X-Frame-Options: DENY` is a global default web filter on all responses, including same-origin.
- `pageContributions` returned by an extension controller are silently dropped (tool controllers
  only). The `AdminExtensionResponseProcessor` SPI (8.1) is Java/OSGi-only, and is what a section
  uses to contribute to the page's CSP — the one thing an extension can add to the host's response.
  Response headers an extension endpoint sets on its own responses come too late for the page.
- Descriptor `config` is **not** localized; only `title`/`description` are.
- `allow` on an extension is tri-state: omitted = everyone (who passed the tool), `[]` =
  `system.admin` only, populated = admin or listed. Note the asymmetry with `AdminTool`, where
  omitted means admin-only.

---

## 2. The contract, v1

**Provider, per section** (`admin/extensions/users/users.yaml` + `users.svg` + controller):

```yaml
kind: 'AdminExtension'
title:
  text: 'Users'
  i18n: 'section.users.title'
interfaces: ['settings.section']
allow: ['role:system.user.admin']
config:
  order: 20
  path: 'users'
```

**Endpoint** (`<toolBase>/_/admin:extension/<app>:<name>`), controller owns the prefix:

| Request                | Serves                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| `GET /_static/main.js` | the section's ES module entry — stable unhashed name, `text/javascript` |
| `GET /_static/*`       | hashed chunks and the unhashed `main.css` beside the entry (text only)  |
| `POST /graphql`        | the section's data plane; client config and phrases as root fields      |

**Types** — the whole client-side contract, shipped by the types-only `@enonic/ui-types`
(duplicated files until the package publishes it). The types are deliberately dumb — names and
one-line docs; behaviour lives in the rules below. Everything mutable is a subscription
(`{get, subscribe}`): `get()` is the current value and `subscribe` reports changes only, never
calling back on subscribe — a nanostores atom satisfies the shape through `listen`, and the contract
never names it:

```ts
export type Readable<T> = { get(): T; subscribe(cb: (v: T) => void): () => void };

export type Notification = {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string; // already localized by the guest
  autoClose?: number | false;
};

/** What every host hands every mount: a section, a panel widget, a menu item. */
export type Host = {
  /**
   * The mounted module's own extension prefix — its data plane lives under it. Its last segment is
   * the extension key `<app>:<name>`, which is how a module serving several mounts tells them apart.
   */
  baseUrl: string;
  /** Resolved page locale; a locale change reloads the page, so it never changes mid-mount. */
  locale: string;
  /** Resolved theme; the guest applies it inside its shadow root (via AppRoot). */
  theme: Readable<'light' | 'dark'>;
  /** Whether this mount is on screen; a hidden mount may pause what only a viewer needs. */
  visible: Readable<boolean>;
  /** Toast on the host's stack; returns dismiss. */
  notify(n: Notification): () => void;
};

/** What a host adds for a mount that owns a segment of its url. */
export type Routed = {
  /** SubPath incl. search params; back/forward arrive here. */
  path: Readable<string>;
  /** Programmatic navigation within the module's own segment. */
  navigate(subPath: string, opts?: { replace?: boolean }): void;
};

/** What `settings.section` hands a section. */
export type SectionHost = Host & Routed;

export type MountOptions<H extends Host = Host> = {
  container: HTMLElement; // inside an open shadow root the host created
  host: H; // valid until unmount, then revoked
};

export type Unmount = () => void; // idempotent, must not throw

export type SectionModule<H extends Host = Host> = { mount(opts: MountOptions<H>): Unmount };
```

`Host` is what every kind of mount gets; `Routed` is the capability a mount with a url segment adds,
and each interface name fixes its host type — `settings.section` hands a `SectionHost`. A future host
whose mounts own no segment (a context panel, a dashboard) hands a `Host` extended with its own
capability, and a section module written against `SectionHost` is unaffected. Every member answers a
question the guest cannot answer on its own, because the host owns the answer: where my data lives and which section I am (`baseUrl`), which language and theme (`locale`,
`theme`), whether anyone is looking (`visible`), where I am and how to move (`path`, `navigate`), and
how to speak to the user outside my column (`notify`).
Anything absent from the list the guest either knows itself or asks its own server. Events are not on
it: a section subscribes to the hub itself. Nor are core api urls: the provider's own controller
builds them with `portal.apiUrl`.

**Routing semantics:**

- `subPath` is an **opaque string owned by the guest**, search params included. The host never
  parses it — it routes the splat, stores it, restores it. Dialogs and filters deep-link by riding
  in it: selection and dialog mode as segments (`/u123/edit`), filters and search as query params
  navigated with `{replace: true}` so typing does not pollute history. What deserves a URL is the
  guest's call; the kit's browse screens should follow one convention.
- `navigate` is **scoped to the caller's own segment by construction** — the host prefixes the
  calling section's slug, so `'/groups'` from the Users section is `/users/groups`, a subPath inside
  Users. Cross-section navigation is deliberately out of v1: membership lists render names as text,
  not links; the user switches sections through the rail. If real usage hurts, an additive
  `url(subPath, extension?)` member (returning `undefined` for a missing or forbidden target) is the
  designed comeback — a same-section `url(subPath)` was in v1 and removed unused, since a section
  has no anchors of its own to build.
- `navigate` is called only from user intent, never from a `path` subscription — except
  normalization with `{replace: true}`. The history is hash-based, so the host intercepts no clicks;
  a section's rows are not anchors.
- While a mount is hidden (keep-alive), its `path` is frozen — it never emits another section's
  subPath — and its `navigate` is a no-op. On being shown again it emits only if the sub-path moved
  while it was away: coming back to where the user left needs no emit, because the guest is already
  rendering it.

**Normative rules the types cannot express:**

- Guests never touch `window.history`/`location`, never write outside their container, never write
  to `document.head`. All user-visible strings cross the boundary localized.
- A `Readable` never calls back on subscribe: read `get()` first, then subscribe for changes.
- A module serving several sections tells them apart by the last segment of `baseUrl`, the
  extension key `<app>:<name>`; `mount` is told nothing else, and anything derived from `host` lives
  with the mount, never at module level.
- Guest CSS attaches inside the shadow root (via `@enonic/ui`'s `AppRoot`); fonts come from the host;
  overlays stay under the host's reserved z-band.
- Events carry IDs, not sensitive payloads; data is re-read through the section's gateway.
- The host never calls `mount` twice for one section without calling the unmount in between; toasts
  belonging to a mount are dismissed when the host revokes its host object.
- Build: `preserveEntrySignatures: 'strict'`, assets under `_static/`, no binary responses, no
  websockets from the prefix.

**Parked, additive when a phase proves the need** (each is a non-breaking addition):

- `connected: Readable<boolean>` (or a reconnect epoch) — when stale-after-reconnect starts
  hurting; XP does not replay events missed while the socket is down.
- `url(subPath, extension?)` — anchors and cross-section links, if their absence proves painful in
  practice.
- `Notification.action` — a button on the toast, the "Deleted — Undo" pattern; removed unused from
  v1.

---

## 3. `@enonic/ui` workstream — shadow root support (parallel to Phase 1)

The condition attached to the shadow DOM decision. All four items live in `npm-enonic-ui`
(tracked as npm-enonic-ui#533, shipped in 1.2.0) — the component kit consumes them, it does not
implement them.
Scope:

1. **`PortalProvider`** — a context carrying the portal container for all overlays (dialogs,
   dropdowns, selects, tooltips, toasts). Defaults to `document.body`, so standalone consumers and
   Content Studio v6 are untouched; in the hub, the guest's `AppRoot` supplies a layer inside its
   shadow root.
2. **Focus & dismissal** — replace `document.activeElement` reads with
   `getRootNode().activeElement`; outside-click detection via `event.composedPath()`, not
   `event.target`.
3. **`AppRoot`** — the library's mount wrapper: `:host` reset against inheritance leaks, the
   `adoptedStyleSheets` attach point, the portal layer. It also adopts `@enonic/ui`'s own shipped
   stylesheets (`tokens.css`, `base.css`, `utilities.css` — the package distributes compiled CSS
   entries) into the shadow root: per root in the hub, instead of per document.
4. **CI smoke** — a story/test rendering dialog + select + tooltip inside a shadow root, so
   shadow-compatibility cannot rot when the next overlay component lands. This is the ongoing tax
   of the shadow decision; it is named here deliberately.

**Acceptance = the Phase 1.2 spike test:** a real screen with a kit dialog, select and tooltip
working inside a shadow root — not a hello-world div. If this reveals a structural blocker, the
recorded fallback is light DOM; nothing else in the plan changes.

---

## 4. Migration plan

Sequencing rule, as planned: **the kit is extracted before any client slice moves out** — otherwise
the first section to leave needs the browse widgets and copies them. That is what happened: Phases 3
and 4 ran before Phase 2, and both providers carry a copy of the widgets that Phase 2 now extracts
from them rather than from the host. Server-side moves (3.2, 4.2) never depended on the kit. The
shadow-DOM workstream in `@enonic/ui` (section 3) ran in parallel with Phase 1 and gated the Phase
1.2 exit.

### Phase 0 — enough contract to start

- 0.1 Contract as one types file (section 2), copied into the host and provider repos.
- 0.2 The host's section-mounting component compiles against it — one shape per repo, not one per
  file.

### Phase 1 — prove the hard parts on a scratch provider

- 1.1 `POST /graphql` on the extension prefix — closes the data path, informs the upload question.
- 1.2 **Shadow root + kit overlays**: `_static` assets, `adoptedStyleSheets`, theme tokens through
  the boundary, dialog/select/tooltip via the updated kit, flicker-free theme switch. Gates on the
  section-3 workstream; this is where the shadow DOM condition is proven or the fallback is taken.
- 1.3 Host object v1 (theme, locale, path/navigate/url, events, notify).
- 1.4 Routing: splat, `path` subscription, `navigate`, deep link, back/forward, collision, unknown
  section.
- 1.5 Lifecycle: switching back and forth with state preserved, hidden-section behaviour, import
  timeout, error boundary, unmount on app removal.
- 1.6 Config and phrases as schema root fields.
- 1.7 Dev override importing the section from a local Vite dev server — so a provider change does
  not cost a jar redeploy.

**Exit:** the scratch section looks and behaves like a real section from a second app; the shadow
DOM condition is proven in code; the contract stops being provisional.

### Phase 2 — extract the component kit

- 2.1 `npm-enonic-ui-toolkit` publishing `@enonic/ui-types`, `ui-utils`, `ui-kit` and
  `input-types` (scaffolding done, npm-enonic-ui-toolkit#1); the generic contract moves into
  `ui-types`; the host and both providers delete their copies.
- 2.2 Browse framework widgets out of the providers' `widgets/` into `ui-kit` — host-free, props
  only (`activeKey`, `detailsShown`); the two provider copies are resynced to one canonical form
  first, so the move is a move.
- 2.3 Transport, format helpers, i18n core and form helpers into `ui-utils`; dialog shells and the
  section runtime (`createHostFrame`, its provider and hooks, from app-users' `shared/host`) into
  `ui-kit`. The transport becomes a factory over an endpoint, not a module singleton.
- 2.4 Both providers consume the kit; the host consumes `ui-types` alone.
- 2.5 Content Studio v6 as a further consumer — a conversation, not a blocker. The `PortalProvider`
  default keeps it unaffected.

### Phase 3 — Applications moves out (into app-applications)

- 3.1 Skeleton: descriptor, controller, `_static`, Gradle wiring — copied from the scratch provider.
- 3.2 Move the applications GraphQL schema and beans. One field short of literal in the event:
  `idProviderApplications` stayed with the ID Providers editor until 4.2, and the id-provider
  descriptor bean was duplicated rather than moved.
- 3.3 Move the client slices (`entities/application`, `pages/applications`, install/uninstall
  features, market fetching).
- 3.4 Wire upload/lifecycle calls: `server:app` mounted on the host, provider proxies where cheap
  (see Data, core API mounts).
- 3.5 Cut over; delete the slice from app-settings; the old lib-admin-ui tool goes.
- 3.6 Harden: deep links, error/empty states, i18n keys moved.

### Phase 4 — Users, Groups, Roles, ID Providers move out (into app-users)

- 4.1 Skeleton mirroring 3.1 — **four extensions, one shared module**.
- 4.2 Finish unified-api Phase 3 in app-settings first, then move the auth schema and `lib/auth/**`
  beans as files.
- 4.3 Move the four client slices and their features.
- 4.4 Cut over section by section; the rail shows a mix of host-owned and extension sections during
  the transition.
- 4.5 Old app-users tool goes.

### Phase 5 — the host becomes a shell

- 5.1 Delete `pages/`, `entities/` (except the extension slice), `features/`; drop the host's own
  GraphQL API and unneeded api mounts.
- 5.2 Harden shell-only concerns: discovery states, rail ordering **and live rail reaction to
  application events**, default section, theme, socket, notifications, title, the empty-rail state
  for users with no accessible sections.
- 5.3 Freeze contract v1, write the upgrade policy. Revisit duplicated types if any duplication
  survived Phase 2.
- 5.4 Optional: a documented sample extension.

---

## 5. Watch list

- **`@enonic/ui`'s shadow tax is permanent.** Every new overlay component must pass the shadow
  smoke. Named, accepted, CI-guarded — but it does not expire.
- **The host tool's api mount list is a known, accepted coupling**: a section needing a new core
  API means a host release. Fine for a first-party set; per-extension api mounts stay on the list
  of things to raise with the platform team.
- **Keep-alive accumulates** — every visited section keeps its DOM and live subscriptions until its
  app leaves the rail. Fine at first-party scale; if it ever hurts, unmount-on-switch is a
  host-only policy change.
- **The loosest section sets the page's policy.** CSP has no per-subtree scope, so every remote
  source any visible section opens is open to all of them. Per-visitor `allow` filtering keeps the
  blast radius to the sections a caller can see; nothing narrows it further, and a section can
  reach `override`/`reset` if it means to.
- **Event stream is coarse-grained** — no per-role filtering; keep payloads to IDs. If a genuinely
  sensitive event type ever appears, that is a platform conversation.
- **Contract churn is expensive** — every breaking change means re-releasing every provider. Keep
  the contract small; let the kit absorb change.
- **Bundle bytes** — Preact + kit + CSS per extension; measure at 1.2, decide with a number.
- **Two-repo debugging** — a failure can be discovery, gates, MIME, or the mount. The host's
  section error state must name which of those failed, not show a generic message.
- **E2E through shadow boundaries** — WebdriverIO deep selectors; factor into the test
  consolidation work (#9).
- **Test-fixture debt** — five test files each build a `ToolConfig`; one added field breaks them
  all. Down from fifteen with Phase 5.1, and still without a shared fixture.
