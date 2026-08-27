# Host facts — app-settings as the shell

What the host provides and does, read off the code on `issue-106`. `docs.md` is the design; this is
what stands. `provider-facts.md` is the other side of the boundary.

## Surface

| Where                                                | What                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/tools/main/main.yaml`                         | `interfaces: [settings.section]`; `apis: graphql, server:app, admin:event, admin:events, admin:extension, com.enonic.xp.app.main:events`; `allow:` the union of the section audiences (`system.admin`, `system.user.admin`, `system.user.app`) |
| `lib/config.ts` → `apis.extensions`                  | the discovery endpoint: `admin:extension` under the tool                                                                                                                                                                                       |
| `entities/extension/`                                | discovery, sorting, slugs, the rediscovery service                                                                                                                                                                                             |
| `app/model/createSectionHost.ts`                     | the `Host` object, one per mounted section, with its `revoke`                                                                                                                                                                                  |
| `app/model/router.ts`, `section-path.ts`             | the url scheme, and the `path` signal a hidden section stops tracking                                                                                                                                                                          |
| `app/ui/SectionMounts.tsx`, `widgets/section-mount/` | one slot per visited section; the shadow host element and the failure phrase                                                                                                                                                                   |
| `shared/sections/`                                   | `contract.ts`, `mountSection`, `isSectionModule`, the shadow container                                                                                                                                                                         |

## Discovery and the rail

- `GET <extensions>?interface=settings.section`, rows already localized and filtered by principals.
  The tool is open to everyone who can reach admin, so **which sections a visitor sees is decided
  entirely by each extension's own `allow`**, server-side, and the shell adds no filter of its own.
  A `system.admin` passes every one of those gates — see `../platform-facts.md`.
  Row → `url: <base>/<key>`, `moduleUrl: <url>/_static/main.js`, `iconUrl: <base><iconUrl>`,
  `order: config.order ?? 1000`, `path: config.path`.
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
- The entry url is per prefix, so a provider's module runs once per section.

## The host object

| Member                     | Host-side behaviour                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                  | the extension prefix                                                                                                                        |
| `locale`                   | the tool config's locale                                                                                                                    |
| `theme`                    | a wrapper over `$resolvedTheme`: calls back on subscribe; listeners dropped at revoke                                                       |
| `path`                     | frozen while hidden; on return emits only if the sub-path moved; no call-back on subscribe; disposed at revoke                              |
| `navigate(sub, {replace})` | `router.history.push/replace` of `/<slug><sub>`, search verbatim; no-op with a console warning while hidden or after revoke                 |
| `url(sub)`                 | `#/<slug><sub>`                                                                                                                             |
| `subscribeEvents`          | the whole `admin:event` stream, unfiltered; every handle dropped at revoke                                                                  |
| `notify`                   | onto the shell's stack with `owner = key`; dedup on tone + text + owner; returns dismiss; a mount's toasts come down at revoke; no-op after |

Revocation runs after the guest's own `unmount()` has returned, so a teardown toast or navigation
still lands. `mount` is not told which section it is.

## Contract

`shared/sections/contract.ts` is the `docs.md` § 2 types, byte-identical below the header in both
repos until `@enonic/toolkit/section` exists. No version handshake: a module without a `mount`
function is the only thing refused.
