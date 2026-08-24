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

**The component kit**, referenced throughout: the npm package extracted from app-settings in
Phase 2 — the browse framework (`browse-layout`, `browse-list`, `browse-toolbar`, `browse-search`,
`details-panel`), dialog and form shells, the GraphQL transport, format helpers and the i18n hook.
It sits on top of `@enonic/ui` (base components: buttons, dialogs, selects) and is what makes a
section a section. Since the runtime is not shared, the kit is the only mechanism by which sections
from different providers look and behave the same: every provider depends on it at build time and
compiles it into its own bundle. **It is `@enonic/toolkit`: a standalone repository
(`npm-enonic-toolkit`) publishing an npm package, like `@enonic/ui`** — app-settings and Content
Studio are both consumers, neither owns it. Content Studio v6 solves the same browse-screen problem
with the same widgets and is the kit's likely third consumer.

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
   `config: {order, path}`), controller, and `<name>.svg` (the rail icon). A multi-section
   provider like app-users ships four descriptors whose entries point at the same module: the
   browser executes it once, module-level state is shared, only `mount()` runs per section.
2. Host tool descriptor declares `interfaces: ["settings.section"]` and mounts
   `apis: ["admin:extension", "admin:event"]`, plus the core APIs sections need — today
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
   The entry name is stable (unhashed) so the host never needs a lookup; hashed chunks and CSS sit
   beside it and resolve relatively. The host calls `mount(...)`; the returned unmount runs when
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
  _host tool's_ `apis:`. If a section ever needs another core API, the host list grows and the
  host is released — accepted for a first-party set. Providers proxy through their own prefix
  where that is cheap (upload _reception_ works in GraalJS); per-extension api mounts remain worth
  raising with the platform team as a future improvement.
- Client config and phrases: root fields on the provider's own GraphQL schema (or a JSON endpoint
  under the prefix for phrases). The controller runs in the provider's app context — `app.config`
  and its own `phrases.properties` via lib-i18n work. The section requests phrases for
  `host.locale` explicitly (a query variable), so it is localized with the same locale as the host
  chrome, not with whatever the browser put in `Accept-Language`.
- Locale change is a page-level reload, as elsewhere in the XP admin. No hot language switching in
  the contract.

### Events

- **One websocket, owned by the host** (`admin:event`). Not a preference: extension endpoints
  cannot serve websockets (verified against XP source, see Platform facts).
- Host forwards the **whole stream** to subscribers; each guest filters in its callback (a kit
  helper owns the filtering idiom). No host-side allow-lists of "relevant" events — that breaks
  the first third-party section.
- A dropped socket loses events silently (XP does not replay). In v1 that risk is accepted as it
  is in the current app; a `connected`/reconnect-epoch member is the parked, additive answer if
  stale-after-reconnect starts hurting (see the contract's parked list).
- **Security note:** XP has no per-event role filtering — any subscriber sees the full stream a
  hub visitor is entitled to open themselves. Events are therefore not a channel for sensitive
  payloads: carry IDs, re-read data through the section's own gateway where `allow` applies.

### Notifications

- One toast stack, owned by the host; guests call `host.notify`. Rendering toasts inside a section
  is ruled out: they would clip against the section's shadow root and column, and stacks would
  compete on section switches.
- `message` arrives **already localized** by the guest; no i18n keys cross the boundary.
- Shape: `{level, message, autoClose?, action?: {label, onAction}}` — `action` covers the
  "Deleted — Undo" pattern. Dedup, stacking and `aria-live` are done once, host-side.
- A hidden section may notify — with keep-alive its mount and host object stay live, so
  "install finished while you were in Users" produces a toast. Only real unmount (the app leaving
  the rail) revokes the host object and ends delivery.

### Routing

- Host owns the URL, real history (TanStack Router), splat route per section:
  `<toolBase>/<slug>/$`. Guests **never** touch `window.history`/`location`.
- `path` on the host object is a subscription and includes search params; back/forward arrive
  through it. Upstream: `host.navigate(subPath, {replace?})`.
- Slug from `config.path`; key is the identity, path is cosmetic; on collision the loser (by
  `(order, key)` — deterministic) falls back to its full key as segment, with a warning.
- Deep link before discovery resolves: hold the pending path, resolve after; unknown section →
  redirect to the first available with a notice.
- Host remembers the last subPath per section and restores it on return; clicking the active rail
  icon resets to the section root. `document.title` is set by the host from the section title.

### Lifecycle

- **Keep-alive on section switch.** A section mounts on first visit; switching away hides its
  host element, switching back shows it — the DOM, scroll position, expanded rows and a
  half-filled dialog are exactly where the user left them. Unmount runs only when the section
  leaves the rail (its app is uninstalled or stopped).
- Hidden sections stay live: their subscriptions keep firing, so they stay fresh and may `notify`.
  This is the accepted cost of keep-alive (see the watch list). If a section ever needs to pause
  expensive work while hidden, optional visibility hooks are an additive contract change.
- **The switch policy is host-side and contract-free.** `mount`/unmount expresses both worlds:
  guests must survive unmount regardless (uninstall already forces that path), so if DOM
  accumulation ever hurts, the host moves to unmount-on-switch without touching a provider.
- The host shows a skeleton until `mount` returns, wraps import + mount in an error boundary with
  an import timeout, and **keeps the section host element mounted in every state** (spike lesson:
  rendering an error instead drops the ref and nothing can mount afterwards).
- `unmount` is idempotent and must not throw; the host wraps it anyway. Shadow root teardown makes
  style cleanup automatic — nothing of the guest's ever entered `document.head`.
- **At unmount the host revokes that mount's host object**: event and store subscriptions handed to
  the mount are dropped, and `navigate`/`notify` calls from a stale reference become no-ops.

### Contract ownership, distribution, versioning

- **The host owns the contract** and the `settings.*` interface namespace; providers follow.
- **v1: types are duplicated in both repos**, with a dev-mode stub extension in the host as the
  cheap drift guard. The duplication window is short by construction — the kit is extracted in
  Phase 2, _before any section moves_, and the contract types move in then as the
  `@enonic/toolkit/section` subpath: the **generic** host↔section contract (`mount`, `Host`,
  `Readable`), with nothing hub-specific in it. Interface names (`settings.section`) are not
  exported as constants — they live in documentation and in descriptors, so the package stays
  hub-agnostic and Content Studio can adopt the same contract with its own interface name and an
  extended host object.
- `mount({container, host})` — object argument, extendable without breaking anyone.
- **No runtime contract versioning.** A `contractVersion` handshake was considered and dropped as
  overkill: every provider is ours, so a contract change ships as a coordinated release of host
  and providers. If a provider we do not control ever appears, versioning comes back as a **new
  interface name** (`settings.section.v2`) — incompatible guests are then simply not discovered,
  which the platform itself enforces — not as a runtime check.
- The object argument keeps the contract **additively extendable**: a new optional host-object
  member breaks nobody. Ideas parked here, none likely while the providers are 2–3 internal apps:
  host-owned confirms/dialogs, wizard-level `document.title`, a busy/progress signal, visibility
  hooks for hidden sections.

### Security and access

- **No same-origin mechanism isolates guest JS** — guest code runs with the host page's session
  and realm. The security model is XP's trust-on-install (only `system.admin` installs apps) plus
  per-extension `allow` gates; shadow DOM isolation buys robustness, not protection from malicious
  code.
- Four independent server-side gates on every extension request, all platform-enforced:
  `role:system.admin.login` on the dispatcher → the host tool's `allow` → the interface/mount
  check → the extension's own `allow` (also applied to the discovery list, so menu and access
  agree).
- The host tool's `allow` widens from `role:system.admin` to the union of the section apps'
  audiences (admin, user-admin, …) — maintained by hand in the tool descriptor; adding a guest
  with a new role means a host descriptor release. Acceptable for a first-party set; the
  alternative (open to `role:system.admin.login` + an "empty rail" state) stays available without
  contract changes.
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
  only). The `AdminExtensionResponseProcessor` SPI (8.1) exists but is Java/OSGi-only.
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
| `GET /_static/*`       | hashed chunks and CSS beside the entry (text only)                      |
| `POST /graphql`        | the section's data plane; client config and phrases as root fields      |

**Types** — the whole client-side contract, shipped as the types-only
`@enonic/toolkit/mount-contract` subpath (duplicated files until the package exists in Phase 2).
The types are deliberately dumb — names and one-line docs; behaviour lives in the rules below.
Everything mutable is a subscription (`{get, subscribe}`; nanostores atoms satisfy the shape
structurally, but the contract never names them):

```ts
export type Readable<T> = { get(): T; subscribe(cb: (v: T) => void): () => void };

export type XpServerEvent = { type: string; timestamp?: number; data?: Record<string, unknown> };

export type Notification = {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string; // already localized by the guest
  autoClose?: number | false;
  action?: { label: string; onAction(): void };
};

export type Host = {
  /** The mounted module's own extension prefix — its data plane lives under it. */
  baseUrl: string;
  /** Resolved page locale; a locale change reloads the page, so it never changes mid-mount. */
  locale: string;
  /** Resolved theme; the guest applies it inside its shadow root (via AppRoot). */
  theme: Readable<'light' | 'dark'>;
  /** SubPath incl. search params; back/forward arrive here. */
  path: Readable<string>;
  /** Programmatic navigation within the module's own segment. */
  navigate(subPath: string, opts?: { replace?: boolean }): void;
  /** Href builder for real anchors within the module's own segment. */
  url(subPath: string): string;
  /** The host's single socket, fanned out; filter in the callback. */
  subscribeEvents(cb: (event: XpServerEvent) => void): () => void;
  /** Toast on the host's stack; returns dismiss. */
  notify(n: Notification): () => void;
};

export type MountOptions = {
  container: HTMLElement; // inside an open shadow root the host created
  host: Host; // valid until unmount, then revoked
};

export type Unmount = () => void; // idempotent, must not throw

export type SectionModule = { mount(opts: MountOptions): Unmount };
```

Every member answers a question the guest cannot answer on its own, because the host owns the
answer: where my data lives (`baseUrl`), which language and theme (`locale`, `theme`), where I am
and how to move (`path`, `navigate`, `url`), what happened on the server (`subscribeEvents`), how
to speak to the user outside my column (`notify`). Anything absent from the list the guest either
knows itself or asks its own server.

**Routing semantics:**

- `subPath` is an **opaque string owned by the guest**, search params included. The host never
  parses it — it routes the splat, stores it, restores it. Dialogs and filters deep-link by riding
  in it: selection and dialog mode as segments (`/u123/edit`), filters and search as query params
  navigated with `{replace: true}` so typing does not pollute history. What deserves a URL is the
  guest's call; the kit's browse screens should follow one convention.
- Both `navigate` and `url` are **scoped to the caller's own segment by construction** — the host
  prefixes the calling section's slug, so `'/groups'` from the Users section is `/users/groups`,
  a subPath inside Users. Cross-section navigation is deliberately out of v1: membership lists
  render names as text, not links; the user switches sections through the rail. If real usage
  hurts, an additive `url(subPath, extension)` overload (returning `undefined` for a missing or
  forbidden target) is the designed comeback — and its absence keeps descriptor keys out of the
  cross-repo API surface.
- `navigate` is called only from user intent, never from a `path` subscription — except
  normalization with `{replace: true}`. Guests render cross-linkable UI as real anchors with
  `href={host.url(...)}`; the host intercepts composed left-clicks on anchors under its base path
  and routes them SPA-style, modified clicks (middle, ctrl/cmd) fall through to the browser.
- While a mount is hidden (keep-alive), its `path` is frozen — it never emits another section's
  subPath — and its `navigate` is a no-op. On being shown again it emits only if the sub-path moved
  while it was away: coming back to where the user left needs no emit, because the guest is already
  rendering it.

**Normative rules the types cannot express:**

- Guests never touch `window.history`/`location`, never write outside their container, never write
  to `document.head`. All user-visible strings cross the boundary localized.
- Guest CSS attaches inside the shadow root (via `@enonic/ui`'s `AppRoot`); fonts come from the host;
  overlays stay under the host's reserved z-band.
- Events carry IDs, not sensitive payloads; data is re-read through the section's gateway.
- The host never calls `mount` twice for one section without calling the unmount in between; toasts
  belonging to a mount are dismissed when the host revokes its host object.
- Build: `preserveEntrySignatures: 'strict'`, assets under `_static/`, no binary responses, no
  websockets from the prefix.

**Parked, additive when a phase proves the need** (each is a non-breaking addition):

- `visible: Readable<boolean>` — when the browse list gains virtualization or other
  measurement-dependent UI that must re-measure after `display`-level hiding.
- `connected: Readable<boolean>` (or a reconnect epoch) — when stale-after-reconnect starts
  hurting; XP does not replay events missed while the socket is down.
- `url(subPath, extension)` — cross-section links, if their absence proves painful in practice.

---

## 3. `@enonic/ui` workstream — shadow root support (parallel to Phase 1)

The condition attached to the shadow DOM decision. All four items live in `npm-enonic-ui`
(tracked as npm-enonic-ui#533) — the component kit consumes them, it does not implement them.
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

Sequencing rule: **the kit is extracted before any section moves out** — otherwise the first
section to leave immediately needs the browse widgets and copies them. The shadow-DOM
workstream in `@enonic/ui` (section 3) runs in parallel with Phase 1 and gates the Phase 1.2 exit.

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

- 2.1 Create `npm-enonic-toolkit` publishing `@enonic/toolkit`; the generic contract moves in as
  the `./section` subpath; release process.
- 2.2 Browse framework widgets out of `widgets/` — host-free, props only. Known unwind: today's
  `widgets/` import `@tanstack/react-router` in three places, and routing is the host's — those
  become props/callbacks before the move.
- 2.3 Request plumbing, format helpers, i18n hook, dialog/form shells out of `shared/`.
- 2.4 app-settings consumes the kit while still owning all five sections (portability proven with
  no migration in flight).
- 2.5 The scratch provider renders a real browse screen from the kit — inside its shadow root.
- 2.6 Content Studio v6 as a second consumer — a conversation, not a blocker. The `PortalProvider`
  default keeps it unaffected.

### Phase 3 — Applications moves out (into app-applications)

- 3.1 Skeleton: descriptor, controller, `_static`, Gradle wiring — copied from the scratch provider.
- 3.2 Move the applications GraphQL schema and beans.
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
- **Event stream is coarse-grained** — no per-role filtering; keep payloads to IDs. If a genuinely
  sensitive event type ever appears, that is a platform conversation.
- **Contract churn is expensive** — every breaking change means re-releasing every provider. Keep
  the contract small; let the kit absorb change.
- **Bundle bytes** — Preact + kit + CSS per extension; measure at 1.2, decide with a number.
- **Two-repo debugging** — a failure can be discovery, gates, MIME, or the mount. The host's
  section error state must name which of those failed, not show a generic message.
- **E2E through shadow boundaries** — WebdriverIO deep selectors; factor into the test
  consolidation work (#9).
- **Test-fixture debt** — 14 test files each build a `ToolConfig`; one added field breaks them all.
  No issue tracks it yet; file one before Phase 1 makes it worse.
