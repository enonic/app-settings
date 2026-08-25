# Extensions — progress

Tracks Phases 0 and 1 of [`docs.md`](./docs.md); nothing beyond has started. Facts live in
`host-facts.md` and `provider-facts.md` — this file is status only.

Host: app-settings, branch `issue-106`. First provider: app-applications, branch `issue-2295` — it
replaces that app's UI, so it cannot merge before Phase 3.

## Status

| `docs.md` | What                                                                                      | State                                                                                          |
| --------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0.1–0.2   | one contract file in both repos; the host's mount compiles against it                     | done                                                                                           |
| 1.1       | `POST /graphql` on the extension prefix                                                   | done — verified on a live XP                                                                   |
| 1.2       | shadow root, `adoptedStyleSheets`, theme tokens; dialog/select/tooltip via `AppRoot`      | root and theming done on `@enonic/ui` 1.2.0 (npm-enonic-ui#534, released); overlays unverified |
| 1.3       | host object v1                                                                            | done                                                                                           |
| 1.4       | routing: splat, `path`, `navigate`, deep link, back/forward, collision, unknown section   | done — an unknown section redirects silently, by decision                                      |
| 1.5       | lifecycle: keep-alive, hidden behaviour, import timeout, error state, unmount, revocation | done                                                                                           |
| 1.6       | config and phrases as schema root fields                                                  | done                                                                                           |
| 1.7       | dev override from a local Vite dev server                                                 | not started                                                                                    |
| —         | rail follows application events and socket reconnects                                     | done, beyond § Discovery 6                                                                     |
| —         | tool at the `admin.login` floor; empty and failed rail states (#113)                      | done, beyond § Security and 5.2                                                                |

Phase 1 exits when 1.2's overlays are verified, 1.7 is done or dropped, and the first two gaps below
are decided.

## Known gaps

- **Merge blocker.** The host's five built-in sections are commented out (`app/model/router.ts`,
  `app/ui/App.tsx`; `pages/**` unlinted); `docs.md` 2.4 and 4.4 keep them until Phases 3–4. Either
  they return beside the discovered ones — a mixed rail — or `docs.md` changes its sequence.
- `pnpm check` is red in the host on `widgets/browse-layout/browse-layout.test.ts`: Node 24 has a
  `localStorage` global, so the `typeof` guard no longer holds. Unrelated to extensions.
- A failed rediscovery still empties the rail and unmounts every section — it now says so
  (`sections.failed`) rather than showing a blank panel.
- No host-side skeleton between import and the guest's first paint; the guest's own is what shows.
- `theme` listeners survive revocation — it is the shell's atom, handed over as-is.
- `mount` carries no section identity; a multi-section provider parses `host.baseUrl`. An additive
  contract member to consider before Phase 2 freezes the types.
- The module runs once per section, not once per app: the entry url is per prefix.
- `@enonic/ui` is not tree-shakeable, so a section costs ~88 kB gz JS + ~15 kB gz CSS before it
  renders anything of its own.
- Nothing on the provider side exercises the host object: its section renders a hardcoded page, so a
  regression in `navigate`, `path`, events or `notify` surfaces only when Phase 3's real screen uses
  them. No test replaces it.
- Provider: `systemApp = true` blocks uninstall (stopping is how a section leaves the rail); no
  `Cache-Control` on `_static/*`; no bootstrap retry.
- 16 host test files each build a `ToolConfig`; one field breaks them all. No issue filed.
- `CLAUDE.md`, `AGENTS.md` and `README.md` carry a status banner, not a rewrite: below it they still
  describe the app as the frame that owns the five sections. `.claude/rules/structure.md` § Sections
  is current.

## Drift to fix in `docs.md`

- § 2 names the types subpath `@enonic/toolkit/mount-contract`; § 1 and 2.1 say
  `@enonic/toolkit/section`. Code assumes `section`.
- § Discovery 1: a multi-section provider's module runs once per section, not once; its module-level
  state is not shared.
- § Discovery 5 and the § 2 table: the stylesheet under `_static/` is an unhashed `main.css`, which
  the guest resolves relative to its module url.
- § Routing: hash history, not "real history" — anchor interception is unnecessary; an unknown
  section redirects without a notice.
- § Lifecycle: two failure modes (the module would not load; the module could not reach its data),
  no host skeleton, and revocation does not reach `theme`.
- § 3 / 1.2: the `@enonic/ui` workstream landed and shipped in 1.2.0 (npm-enonic-ui#534,
  2026-08-25); the provider takes it from the registry.
- § 5: the failed stage is named in the console and one phrase shown, by decision; 14 fixtures → 16.
- The platform facts at the end of `provider-facts.md` belong in `../platform-facts.md`.
