# Host facts — app-settings as the shell

What the host provides and does, read off the code on `extensions` after #134. `docs.md` is the
design; this is what stands. `provider-facts.md` is the other side of the boundary.

## Surface

| Where                                                | What                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/tools/main/main.yaml`                         | `interfaces: [settings.section]`; `apis: server:app, admin:events, admin:extension, com.enonic.xp.app.main:events` — the shell owns no api of its own; `allow:` the union of the section audiences (`system.admin`, `system.user.admin`, `system.user.app`) |
| `lib/config.ts` → `apis.extensions`                  | the discovery endpoint: `admin:extension` under the tool                                                                                                                                                                                                    |
| `lib/csp.ts`                                         | the page's `Content-Security-Policy` baseline, and the two operator config keys                                                                                                                                                                             |
| `entities/extension/`                                | discovery, sorting, slugs, the rediscovery service                                                                                                                                                                                                          |
| `app/model/createSectionHost.ts`                     | the `Host` object, one per mounted section, with its `revoke`                                                                                                                                                                                               |
| `app/model/router.ts`, `section-path.ts`             | the url scheme, and the `path` signal a hidden section stops tracking                                                                                                                                                                                       |
| `app/ui/SectionMounts.tsx`, `widgets/section-mount/` | one slot per visited section; the shadow host element and the failure phrase                                                                                                                                                                                |
| `shared/sections/`                                   | `contract.ts`, `mountSection`, `isSectionModule`, the shadow container                                                                                                                                                                                      |
| `shared/admin-events/topics.ts`                      | the hub topic names the shell publishes and subscribes; `lib/events/index.test.ts` pins them against what `lib/events/` registers                                                                                                                           |

## Content security policy

- `lib/csp.ts`, called first thing in the tool controller: `strict()` — `default-src 'none'`,
  `base-uri 'none'`, `frame-ancestors 'none'` — then `script-src 'self'`,
  `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `font-src 'self'`,
  `connect-src 'self'` and `form-action 'none'`. Everything a section serves is same-origin under
  this page, so `'self'` is what makes sections work at all and the baseline covers a well-behaved
  section whole.
- **Nothing else is named, deliberately.** `default-src 'none'` denies `object-src`, `frame-src`,
  `media-src` and the rest by fallback, and naming one to close it would insert the directive key —
  which is exactly what a section processor's `directive(…).isPresent()` guard tests. An unnamed
  directive is one a section cannot open. `form-action` is the single exception, and it has to be
  named: it has no `default-src` fallback.
- `'unsafe-inline'` on `style-src` is here for one thing, the page's `@font-face` block in
  `main.html`. Preact and `@enonic/ui` write element styles through CSSOM (`setProperty`,
  `cssText`), which CSP does not govern at all, and a section's adopted stylesheet is a constructed
  `CSSStyleSheet`, equally ungoverned — so this is retirable, not permanent: `nonceStyleSrcElem()`
  on that block plus `styleSrcElem(SELF, nonce)`, since declaring `style-src-elem` takes over the
  fallback for the `main.css` link. Until then it is the loosest source in the policy. No
  `'strict-dynamic'` either — it would make `'self'` ignored, and every section is mounted by
  `import(moduleUrl)`.
- Two keys in `com.enonic.xp.app.settings.cfg`: `contentSecurityPolicy.enabled=false` removes the
  header, `contentSecurityPolicy.header` is unioned in last so an operator can widen a directive
  without restating the baseline. Both are read trimmed — a `.cfg` value keeps its trailing
  whitespace, and `false ` has to mean off.
- **A section adds a remote source itself**, through the platform's SPI, and the host never names
  another app's hosts — see `provider-facts.md`. Disabling the header here disables the whole chain,
  because a section processor only extends directives that are already declared.

## Discovery and the rail

- `GET <extensions>?interface=settings.section`, rows already localized and filtered by principals.
  The tool is open to everyone who can reach admin, so **which sections a visitor sees is decided
  entirely by each extension's own `allow`**, server-side, and the shell adds no filter of its own.
  A `system.admin` passes every one of those gates — see `../platform-facts.md`.
  Row → `url: <base>/<key>`, `moduleUrl: <url>/_static/main.js`, `iconUrl: <base><iconUrl>`,
  `order: config.order ?? 1000`, `path: config.path`, `module: config.module`.
- Sorted by `(order, key)`. Slug = `config.path` when it matches `[a-z0-9-]+` and is unclaimed, else
  the key, with a console warning; read per call, so a collision resolved differently after an
  install moves it.
- Icons are painted as a CSS mask in the foreground colour: the platform serves an image, and an svg
  in `currentColor` would come out black.
- Rediscovery on `application` events `INSTALLED | UNINSTALLED | STARTED | STOPPED | UPDATED`,
  debounced 300 ms, and on every socket reconnect. It never shows "loading"; a failure sets
  `items: []`, and every mount goes with it.
- With nothing to mount the content area carries the state itself (`emptyReason` in `AppShell`,
  `widgets/sections-empty/`): `sections.empty` where discovery answered with no section — plus
  `sections.empty.hint` for a visitor who is not `system.admin` — and `sections.failed` where it could
  not be asked. `loading` shows neither. The rail and the app bar render empty beside it.
- Rail items are plain anchors: `#/<slug>` for the active section (reset), `#/<slug><last sub-path>`
  for the others.

## Routing

- `createHashHistory`, one route template `$slug/$`. `AppShell` renders the sections itself, not
  through an `Outlet`, so keep-alive rests on keyed slots.
- The sub-path is everything after the slug, search string included, verbatim: it is read from
  `router.history.location` raw, never from the router's re-serialized state. In the url a `%`
  becomes `%25` and a `#` becomes `%23`; the read undoes both. `/users` does not answer for
  `/users-admin`.
- Remembered per slug for the session. An unknown slug — `/` included — goes to the first section
  once discovery has landed, silently.
- Anything in the tool url's own query string is merged into the router location by hash history
  and would reach every guest's `path`. No host feature may use it.

## Mounting

- First visit mounts; switching away hides (`display: none`) and keeps everything; the slot goes —
  unmount, then revoke — only when the key leaves discovery. A section that leaves and returns
  remounts hidden.
- `mountSection`: shadow root with a `display: contents` container → `import(moduleUrl)` under a
  15 s timeout → `isSectionModule` → `mount({container, host})`. On failure one phrase on screen
  (`sectionMount.failed`) and the stage in the console — could not be imported, exports no mount
  function, threw while mounting. The host element stays mounted in every state. No host skeleton.
- An app's sections share one module: the host rewrites the group's `moduleUrl` to its first row's
  (by `(order, key)`), so the browser executes the module once and `mount` runs per section.
  `config.module` names a sharing group within the app — the per-section opt-out. Each section's
  `url` (its data plane) stays its own.

## The host object

Neither `Readable` calls back on subscribe: a guest reads `get()` first. `createSectionHost.test.ts`
pins it for `theme`, `section-path.test.ts` for `path`.

| Member                     | Host-side behaviour                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                  | the extension prefix, ending in the extension key — how a multi-section module knows which section it is                                                          |
| `locale`                   | the tool config's locale                                                                                                                                          |
| `theme`                    | a `listen` wrapper over `$resolvedTheme`; listeners dropped at revoke                                                                                             |
| `visible`                  | whether the section is the one the url shows, emitted once per switch; disposed at revoke                                                                         |
| `path`                     | frozen while hidden; on return emits only if the sub-path moved; disposed at revoke                                                                               |
| `navigate(sub, {replace})` | `router.history.push/replace` of `/<slug><sub>`, search verbatim; no-op with a console warning while hidden or after revoke                                       |
| `notify`                   | onto the shell's stack with `owner = key`; dedup on tone + text + owner; `autoClose` honoured; returns dismiss; a mount's toasts come down at revoke; no-op after |

`autoClose` and the dismiss return are implemented and used by no provider yet. `url` and
`Notification.action` were in v1 and went unused; #134 removed them before the contract is published.

Revocation runs after the guest's own `unmount()` has returned, so a teardown toast or navigation
still lands. `mount` is not told which section it is.

## Contract

`shared/sections/contract.ts` is the `docs.md` § 2 types, byte-identical in the host and both
providers until `@enonic/ui-types` publishes them. The shell hands a `SectionHost`: the base `Host`
every kind of mount gets plus `Routed`, the url segment a section owns. Types only: the hub topic names live beside the
subscriber in `shared/admin-events/topics.ts`, and a provider copies the ones it needs from the
`docs.md` § Events table. No version handshake: a module without a `mount` function is the only
thing refused.
