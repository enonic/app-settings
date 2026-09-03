# Extensions — progress

Status of every phase in [`docs.md`](./docs.md) § 4, plus the `@enonic/ui` workstream in its § 3.
Facts live in `host-facts.md` and `provider-facts.md`, decisions in `docs.md` — this file is status
only.

Host: app-settings, branch `extensions`. Providers: app-applications (`extensions`, one section) and
app-users (`extensions`, four sections from one module). Both replaced their lib-admin-ui tools; the
legacy applications live on their `master` branches as maintenance lines.

## Phase 0 — enough contract to start: done

| `docs.md` | What                                                                  | State |
| --------- | --------------------------------------------------------------------- | ----- |
| 0.1–0.2   | one contract file in every repo; the host's mount compiles against it | done  |

## Phase 1 — prove the hard parts on a scratch provider: done, one item dropped

| `docs.md` | What                                                                                      | State                                                                                             |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1.1       | `POST /graphql` on the extension prefix                                                   | done — verified on a live XP                                                                      |
| 1.2       | shadow root, `adoptedStyleSheets`, theme tokens; dialog/select/tooltip via `AppRoot`      | done — `@enonic/ui` 1.2.0; overlays exercised by both providers' dialogs since the sections moved |
| 1.3       | host object v1                                                                            | done; trimmed by #134, see below                                                                  |
| 1.4       | routing: splat, `path`, `navigate`, deep link, back/forward, collision, unknown section   | done — an unknown section redirects silently, by decision                                         |
| 1.5       | lifecycle: keep-alive, hidden behaviour, import timeout, error state, unmount, revocation | done                                                                                              |
| 1.6       | config and phrases as schema root fields                                                  | done                                                                                              |
| 1.7       | dev override from a local Vite dev server                                                 | dropped — `-Penv=dev` with `pnpm dev` in the provider is the loop both providers use              |

## `@enonic/ui` shadow workstream (`docs.md` § 3, parallel to Phase 1): shipped

Landed as npm-enonic-ui#534, released 2026-08-25 as 1.2.0: `PortalProvider`, focus and dismissal
through `getRootNode`/`composedPath`, `AppRoot`, and the CI smoke that is the permanent shadow tax.
Every repo takes it from the registry.

## Phase 2 — extract the component kit: in progress

| `docs.md` | What                                                                                             | State                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 2.1       | `npm-enonic-ui-toolkit`, four packages; the contract into `@enonic/ui-types`                     | scaffolding done (npm-enonic-ui-toolkit#1); contract not moved yet                                    |
| 2.2       | browse framework widgets out of the providers into `ui-kit`                                      | not started; the two provider copies are being resynced first (app-applications#2322, app-users#2688) |
| 2.3       | transport, format, i18n, form helpers into `ui-utils`; dialogs and section runtime into `ui-kit` | not started                                                                                           |
| 2.4       | providers consume the kit; the host consumes `ui-types` alone                                    | not started                                                                                           |
| 2.5       | Content Studio v6 as a further consumer                                                          | not started                                                                                           |

The plan's 2.4 originally had app-settings consume the kit while still owning the sections; the
sections left first, so that step is gone. `docs/browse-framework.md` moved to the toolkit's `docs/`
with #134, ahead of the code it specifies.

## Phase 3 — Applications moves out (into app-applications): done

Skeleton #2296, GraphQL #2300, client slices and lifecycle wiring #2316, hub subscription #2315,
market install progress #2319. The old lib-admin-ui tool went in the process.

What the plan did not foresee, kept here because it is recorded nowhere else:

- 3.2 ran before Phase 2, deliberately: nothing server-side needs the component kit.
- `idProviderApplications` stayed in the host until Phase 4 took it — it is the ID Providers editor's
  question, not an Applications screen's — and the id-provider descriptor bean was duplicated rather
  than moved.
- Two operator-facing cfg keys became app-applications' — `marketApiUrl` unchanged,
  `applications.managedMode` → `managedMode`.
- Core api urls left the contract (3.4.1 reversed): the provider's `config` root answers
  `serverAppUrl`, built with `portal.apiUrl`, because a request to an extension keeps the hosting
  tool's `baseUri`. The mount stays in the host tool's `main.yaml`.
- The whole section was code-complete before it was exercised in a browser end to end.

## Phase 4 — Users, Groups, Roles, ID Providers move out (into app-users): done

Epic app-users#2628: toolchain #2637, four descriptors and the endpoint #2638, the principals
GraphQL layer and `lib/auth/**` beans #2639, the four section UIs #2640, hub subscriptions #2655,
notifications #2630, the per-mount host frame #2659, cutover #2642. The old app-users tool went
with #2637, at the first step rather than the last. Open there: permission reports (#2641),
reactions to principal events (#2656).

## Phase 5 — the host becomes a shell: 5.1 and most of 5.2 done

| `docs.md` | What                                                                   | State                                                                                   |
| --------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 5.1       | delete `pages/`, `entities/`, `features/`; drop the host's GraphQL API | done — #134                                                                             |
| 5.2       | harden shell-only concerns                                             | rail reaction, `allow` union, empty and failed states done (#113, #129); the rest below |
| 5.3       | freeze contract v1, write the upgrade policy                           | contract trimmed by #134; freezes when `ui-types` publishes it                          |
| 5.4       | optional: a documented sample extension                                | not started                                                                             |

### What #134 did — Clean up and sync

The host and both providers were reviewed together before the contract moves to `@enonic/ui-types`;
the same title runs in app-applications (#2322) and app-users (#2688). In the host:

- **Contract.** `Readable.subscribe` never calls back on subscribe: `theme` wraps
  `$resolvedTheme.listen`, and `createSectionHost.test.ts` pins it. `Host.url` and
  `Notification.action` removed — no provider used them; `autoClose` and the dismiss return stay.
  `Host` split into the base every mount gets and `Routed` (`path`, `navigate`), with
  `SectionHost = Host & Routed` as what `settings.section` hands over — so a host whose mounts own no
  url segment can adopt the base unchanged. `visible: Readable<boolean>` added — the shell knows which section shows, and app-users had started
  watching the DOM for it; both providers' frames now read it off the host.
  `HUB_TOPICS` left `contract.ts` for `shared/admin-events/topics.ts`: the contract is types only
  and byte-identical across repos again, and a provider carries only the topics it subscribes.
  Section identity stays read off the tail of `baseUrl`, now recorded as the rule in `docs.md` § 2.
- **Phase 5.1.** 195 unreachable client files went — the five section slices, their features, the
  browse widgets, `shared/{detail,dialog,form,format,search,selection,ui}` — with their tests, 192
  section phrases, the `pages/**` lint exclusion, and every server-side trace of the sections:
  `apis/graphql/`, `lib/{idprovider,publickey}`, `src/main/java`, `src/test/{java,resources}`, the
  `graphql` mount, the java toolchain and test dependencies, lib-graphql, `xplibs.{app,project}`.
  `lib/auth.ts` shrank to `isAdmin`. 54 client files remain. The providers' copies of the deleted
  code are canonical; the host's widget tests matched app-applications', so nothing was lost.
- **Docs.** `browse-framework.md` to the toolkit, `unified-api.md` to app-users,
  `provider-facts.md`' platform facts into `platform-facts.md`; every `@enonic/toolkit` reference
  renamed to the four real packages; `CLAUDE.md`, `AGENTS.md`, `README.md` and `.claude/rules/`
  describe a shell.

## Known gaps

- A failed rediscovery still empties the rail and unmounts every section — it says so
  (`sections.failed`) rather than showing a blank panel.
- No host-side skeleton between import and the guest's first paint; the guest's own is what shows.
- `@enonic/ui` is not tree-shakeable, so a section costs ~88 kB gz JS + ~15 kB gz CSS before it
  renders anything of its own.
- Provider: `systemApp = true` blocks uninstall (stopping is how a section leaves the rail); no
  `Cache-Control` on `_static/*`; no bootstrap retry.
- Five host test files each build a config fixture; one field breaks them all. No shared fixture, no
  issue filed.
- The remembered details-column width is stored under a key without an `xp.admin.*` namespace; whether
  the family belongs there is still open (a one-line change in the providers).
- Whether the hub connection a provider opens should close with its last mount is unresolved; today
  it lives for the page, which keep-alive makes harmless.
