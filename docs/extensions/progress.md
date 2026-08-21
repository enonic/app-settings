# Extensions — progress

Where the migration `docs.md` plans has got to. **Phases 0 and 1 only**; nothing beyond has
started. Facts and reasoning live in `host-facts.md` (host) and `provider-facts.md` (provider) —
this file is status and open work, nothing else.

**app-settings** is the host, branch `issue-106`. **app-applications** is the first provider, branch
`issue-2295` — it deletes that app's existing UI, so it cannot merge before Phase 3.

## Status

| Subphase                                | State                                                |
| --------------------------------------- | ---------------------------------------------------- |
| 0 — the contract, compiling both sides  | **done**                                             |
| 1.1 — host in extension mode            | **done**                                             |
| 1.2 — discovery and the rail            | **done**                                             |
| 1.3 — routing                           | **done**, minus remembered sub-paths                 |
| 1.4 — mount inside a shadow root        | **done**                                             |
| 1.5 — host object v1                    | **partly** — built, not hardened                     |
| 1.6 — the provider's own GraphQL        | **done** in code; the live exit check is still unrun |
| 1.7 — keep-alive and lifecycle          | not started                                          |
| 1.8 — `@enonic/ui` overlays in the root | npm-enonic-ui#533/#534, owned elsewhere              |
| 1.9 — dev override for the module url   | not started                                          |

Numbering diverges from `docs.md` § Phase 1 (1.1 graphql, 1.2 shadow, 1.3 host object,
1.4 routing, 1.5 lifecycle, 1.6 config, 1.7 dev override). Where that document says "the Phase 1.2
spike", it means **1.8** here.

Working today: a section from a second application discovers, routes, mounts inside its own shadow
root, styles itself, reads the host object, and fetches its own config and phrases from its own
endpoint.

## Left in Phase 1

Each item ends deployable: `pnpm check` in both repos, then `./gradlew deploy -Penv=dev` in both.

**1.6 — the live exit check.** Nothing since 1.6a's `probe` has run against a real XP. Confirm: the
section paints its skeleton then its own phrase, app key and version; the rail title comes from the
provider's bundle with `config.order: 10`; **dark mode works inside the shadow root**; a forced
GraphQL failure shows the section's own error, not `sectionMount.failed`.

**1.5 — harden the host object.**

- Revoke it at unmount: drop that mount's subscriptions, make stale `navigate`/`notify` no-ops,
  dismiss its toasts — which needs an owner tag first, since `notify` dedups and shares ids.
- Forward the **whole** event stream: `isRelevantServerEvent` moves into its existing consumers.
- 1.3 leftovers: remember the last sub-path per section, and reset to the section root when the active
  rail icon is clicked.
- Extract and test the sub-path and splat helpers — inline closures today, and `splat` drops the query
  string, so `navigate` and `url` lose search params the contract says they carry.

**1.7 — keep-alive and lifecycle.**

- One mount per section key in a registry, hidden with `display: none` on a switch. Unmount only when
  the key leaves discovery. Host and mount are keyed on the `SectionExtension` _object_ today, so
  rediscovery remounts everything — fix that first or re-running discovery destroys the state
  keep-alive exists to protect.
- `path` freezes while hidden and `navigate` becomes a no-op; the current value is emitted on show.
- Re-run discovery on `application` server events.
- Blocked by `systemApp = true` in the provider — uninstall is otherwise unreachable.

**1.8 — `@enonic/ui` overlays inside the shadow root.** Owned by npm-enonic-ui#533/#534. Re-enters
here when it lands: a dialog, a select and a tooltip through `AppRoot`, with the `:host` reset and the
theme class moving into the library. Two findings to hand over — dark tokens and `dark:` variants need
a class **inside** the root, and the library needs `sideEffects: false` plus per-component output
before its bytes are acceptable per provider.

**1.9 — dev override for the module url.** A host config key or a url query param; the second needs no
redeploy to toggle. Not the cheap win it looks like: Vite's dev server injects styles into
`document.head`, which the contract forbids and `adoptedStyleSheets` cannot see, so dev mode needs its
own styling path.

## Known gaps

- Host object not revoked at unmount — 1.5.
- Events filtered before the fan-out — 1.5.
- No keep-alive, so `path` is never frozen — 1.7.
- A failed discovery says nothing; the rail just stays empty — 5.2.
- No `:host` reset in the guest; inheritable properties leak in from the host's `body` — 1.8.
- No `Cache-Control` on `_static/*`; every visit re-downloads module and stylesheet in full.
- `systemApp = true` in the provider blocks the uninstall path 1.7 needs.
- Bundle bytes: ~87 kB gz JS + ~12.5 kB gz CSS per section, per provider.

## Drift to fix in `docs.md`

- § 2 calls the types-only subpath `@enonic/toolkit/mount-contract`; § 1 and Phase 2.1 call it
  `@enonic/toolkit/section`. The code assumes `section`.
- The endpoint table says `_static/*` serves "hashed chunks and CSS". The stylesheet is deliberately
  unhashed and named `main.css`, because the guest resolves it relative to its own module url.
- § Routing says "real history"; the router uses hash history — which also removes the
  anchor-interception item.
- § Lifecycle assumes one section failure mode; there are two.
- Phase 1's subphase numbering does not match this file's; see above.
- The XP facts at the end of `provider-facts.md` belong in `../platform-facts.md`.
