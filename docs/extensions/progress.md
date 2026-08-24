# Extensions — progress

Where the migration `docs.md` plans has got to. **Phases 0 and 1 only**; nothing beyond has
started. Facts and reasoning live in `host-facts.md` (host) and `provider-facts.md` (provider) —
this file is status and open work, nothing else.

**app-settings** is the host, branch `issue-106`. **app-applications** is the first provider, branch
`issue-2295` — it deletes that app's existing UI, so it cannot merge before Phase 3.

## Status

| Subphase                                | State                                       |
| --------------------------------------- | ------------------------------------------- |
| 0 — the contract, compiling both sides  | **done**                                    |
| 1.1 — host in extension mode            | **done**                                    |
| 1.2 — discovery and the rail            | **done**                                    |
| 1.3 — routing                           | **done**, minus remembered sub-paths        |
| 1.4 — mount inside a shadow root        | **done**                                    |
| 1.5 — host object v1                    | **1.5a and 1.5b done**; revocation left     |
| 1.6 — the provider's own GraphQL        | **done** — exit check verified on a live XP |
| 1.7 — keep-alive and lifecycle          | not started                                 |
| 1.8 — `@enonic/ui` overlays in the root | npm-enonic-ui#533/#534, owned elsewhere     |
| 1.9 — dev override for the module url   | not started                                 |

Numbering diverges from `docs.md` § Phase 1 (1.1 graphql, 1.2 shadow, 1.3 host object,
1.4 routing, 1.5 lifecycle, 1.6 config, 1.7 dev override). Where that document says "the Phase 1.2
spike", it means **1.8** here.

**1.6's exit check has run** (deployed to a local XP, both repos, 2026-08-24): the section paints its
skeleton and then its own phrase, app key and version; the rail title comes from the provider's own
bundle with `config.order: 10`; dark mode works inside the shadow root; a forced GraphQL failure shows
the section's own error rather than `sectionMount.failed`. Nothing in the host↔provider path is
unproven any more — what is left in Phase 1 is hardening, not discovery.

Working today: a section from a second application discovers, routes, mounts inside its own shadow
root, styles itself, reads the host object, and fetches its own config and phrases from its own
endpoint.

## Left in Phase 1

Six pieces of work, in the order they should be done — the ordering is not `docs.md`'s and not the
table's, because revocation and sub-path memory both belong _inside_ the mount registry 1.7 builds,
and doing them first would mean writing them twice. **B and C are done.** Each ends deployable:
`pnpm check` in both repos, then `./gradlew deploy -Penv=dev` in both.

### A — unblock the gate

`pnpm check` is **red in the host** on `widgets/browse-layout/browse-layout.test.ts`, and has nothing
to do with extensions: the test runner now starts node with `--localstorage-file`, so
`typeof localStorage === 'undefined'` no longer holds and the "no storage to read" case reaches a
`localStorage` with no `getItem`. `browse-layout.ts` needs a real capability check, not a `typeof`
guard. Every item below ends on this command, so it goes first.

### B — 1.5a: the routing helpers, extracted and tested — **done**

`shared/sections/section-path.ts`, tested: `readSubPath` reads a section's own sub-path out of the
shell's location, `sectionPath` turns one back into a shell path. Three things the inline closures got wrong:
the query string was dropped by `navigate` and `url` though the contract says a subPath carries it;
`/users` answered for `/users-admin`; and a `#` in a sub-path ended the url, hash history being what
it is.

**`navigate` goes through `router.history`, not `router.navigate`** — the router parses a search
string into its own object and re-serializes it, and the sub-path is the guest's string to write. A
history push notifies the same subscriber (`router.history.subscribe(router.load)`) that
`router.navigate` relies on, so routing, back/forward and `__TSR_index` are unaffected.

### C — 1.5b: forward the whole event stream — **done**

`connectToServerEvents` filtered with `isRelevantServerEvent` before `dispatch`, so a guest could
never see an event this app had not anticipated — the one thing `docs.md` § Events rules out. The
socket now fans out everything it can parse. No consumer changed: all three already filter for
themselves (`toApplicationChange`, `affectsMarket`, `toInstallProgress`), and
`isRelevantServerEvent`/`isPrincipalNode` stay as the idiom `@enonic/toolkit` will own in Phase 2.

### D — 1.7: keep-alive, and the identity the rest depends on

- **Mount identity is the `SectionExtension` object today**, not its key: `SectionRoute` memoizes the
  host on `[section]` and `SectionMount` re-runs its effect when `host` changes, so a rediscovery —
  which allocates new row objects — remounts every section. Fix this before anything keyed on a mount
  is written, or rediscovery destroys the state keep-alive exists to protect.
- One mount per section key, hidden with `display: none` on a switch, mounted on first visit only.
  Rendering the discovered sections as a keyed list gives "unmount when the key leaves discovery" for
  free — no manual registry to keep in step.
- `path` freezes while hidden and `navigate` becomes a no-op; the current value is emitted on show.
  Both are answerable inside `createSectionHost` from the router's active slug, so neither needs a new
  contract member.
- Re-run discovery on `application` server events — nothing subscribes today, so the rail is whatever
  discovery returned at startup.
- Needs `systemApp = false` in the provider: with it true the app cannot be uninstalled, and uninstall
  is the only path that reaches unmount.

### E — 1.5c + 1.3 leftovers: revocation and sub-path memory

Both live in the structure D builds.

- **Revoke a mount's host object at unmount**: drop its subscriptions, make a stale
  `navigate`/`notify` a no-op, dismiss its toasts.
- Dismissing its toasts needs an **owner tag** first — `notify` dedups on tone and text and hands back
  the id of the notification already up, so without one section revokes another's toast.
- Remember the last sub-path per section and restore it when the rail returns there; clicking the
  **active** rail icon resets to the section root. (The reset works today only because the rail's
  `Link` always targets `/$slug`; once the link carries the remembered sub-path, the two cases have to
  be told apart deliberately.)
- An unknown slug redirects silently. `docs.md` § Routing says "with a notice".

### F — 1.9: dev override for the module url

A url query param rather than a host config key, so toggling it needs no redeploy. Not the cheap win
it looks like: Vite's dev server injects styles into `document.head`, which the contract forbids and
`adoptedStyleSheets` cannot see. Two ways out — a dev-only path in the guest that mirrors Vite's
injected `<style>` elements into its own root, or a documented **dev-only exemption** from the
head-writing rule. The exemption is nearly free and buys the same round-trip saving.

### Exit

- Fix the six drift items in `docs.md` (below) and move the XP facts at the end of
  `provider-facts.md` into `../platform-facts.md` — they are not there yet.
- Provider chores that should not reach app-users by being copied: `Cache-Control` on `_static/*`,
  `.DS_Store` in `.gitignore` and the `processResources` excludes, a retry on bootstrap.
- File the test-fixture debt issue (`docs.md` § 5: 14 test files each build a `ToolConfig`; it is 15
  now).

Out of Phase 1 by decision: **1.8** is npm-enonic-ui#533/#534 and re-enters here when it lands — a
dialog, a select and a tooltip through `AppRoot`, with the `:host` reset and the theme class moving
into the library. Two findings to hand over: dark tokens and `dark:` variants need a class **inside**
the root, and the library needs `sideEffects: false` plus per-component output before its bytes are
acceptable per provider. A failed discovery saying nothing is **5.2**.

## Known gaps

- Host object not revoked at unmount — E.
- No keep-alive, so `path` is never frozen and a rediscovery remounts everything — D.
- A failed discovery says nothing; the rail just stays empty — 5.2.
- No `:host` reset in the guest; inheritable properties leak in from the host's `body` — 1.8.
- No `Cache-Control` on `_static/*`; every visit re-downloads module and stylesheet in full.
- `systemApp = true` in the provider blocks the uninstall path D needs.
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
