---
paths:
  - 'src/main/resources/assets/js/**'
---

# Frontend structure

Feature-Sliced Design layout. Content Studio v6 is where it was learned from, not an authority —
where its own tree deviates, these rules win. Imports run one way:

```
app  →  widgets / features  →  entities  →  shared
```

No exceptions. A widget that needs app-level data takes it as a prop and declares its own view model
for it — `SectionRail` owns `SectionRailItem` and `AppShell` maps the discovered sections into it,
rather than the widget reaching up into `entities/extension`.

| Layer                | Holds                                                                            | Never                             |
| -------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| `app/`               | shell, router, the host object, section mounting, bootstrap                      | domain logic                      |
| `widgets/`           | the shell's composite blocks: rail, mount slot, empty state, toast list          | `entities/` imports               |
| `features/<action>/` | one user action — the theme switcher is the one there is                         | any import to or from `widgets/`  |
| `entities/<domain>/` | one domain slice: `api/`, `model/` — `extension` is the one domain the shell has | UI beyond a domain-specific badge |
| `shared/`            | api client, config, i18n, admin events, notifications, app state, sections, menu | importing anything above          |

`app/` is split into two segments: `ui/` for its components, `model/` for everything else — the
router, the section host object, the shell's hooks.

**`widgets/` and `features/` never import each other**, in either direction. They sit on one level
here, and canonical FSD puts `widgets` above `features` — so an import between them is either a
same-layer cross-import or one pointing upwards, depending on which reading you take, and neither is
allowed. A component both would need goes to `shared/ui/`; the shell has none today.

## File names

| Kind         | Pattern                                  |
| ------------ | ---------------------------------------- |
| Component    | `PascalCase.tsx`, one component per file |
| Store        | `<name>.store.ts`, atoms prefixed `$`    |
| Api          | `api/<subdomain>.api.ts`                 |
| Types        | `model/<domain>.types.ts`                |
| Hook         | `use<Thing>.ts`                          |
| Pure helpers | `<name>.ts`, named exports only          |
| Test         | `<file>.test.ts(x)` next to its subject  |

Folders are `kebab-case`. `shared/` and `entities/` slices are consumed through an `index.ts` barrel;
components under `widgets/` are imported by file path — no barrels there. A barrel never re-exports a
store's internals.

## Slices and segments

A slice under `entities/` is split into segments, and the segment names are fixed:

```
entities/extension/
  api/extensions.api.ts          the discovery request and its dto mapping
  model/extensions.store.ts      facts, computed
  model/extensions.load.ts       the loader: owns the request and the cancelling
  model/extensions.service.ts    start()/stop(): rediscovery on hub events
  model/extension.types.ts       domain types
  index.ts                       the slice's public API
```

- `api/` and `model/` exist even for a single file. One judgement call fewer, and the I/O boundary
  stays visible in the tree.
- Segment files keep their suffix — `*.api.ts`, `*.store.ts`, `*.service.ts`, `*.types.ts` — so the
  rule globs above and a plain grep keep finding them.

## Components

`export function Name()` — not arrow consts assigned to a variable. Props type named
`<Name>Props`, declared with `type`, exported when the component is exported. No default exports.

## i18n

Every user-visible string goes through `shared/i18n`. `i18n/phrases.properties` holds the shell's
phrases, sentence-case even where the UI uppercases them.

**A component names its strings at the top and renders them by name**, through the `useI18n(key, …values)`
hook — Content Studio's `shared/lib/hooks/useI18n.ts` is the same hook:

```tsx
export function SectionMount({ failed }: SectionMountProps) {
  const failedLabel = useI18n('sectionMount.failed');

  return failed ? <p role="alert">{failedLabel}</p> : null;
}
```

Everything the component can say is then visible before it says it, its JSX carries values rather than
lookups, and the memo inside the hook keeps a re-render from resolving the phrase again. One key or the
other goes inside the hook because a hook cannot be called conditionally, and for the same reason the
calls sit above any early return.

**A list whose items carry a `labelKey` goes through `useLabelled(items)`**, which resolves each label
once — a hook cannot be called per item. The list stays a module constant holding keys, and only what
renders it sees labels.

**`i18n(key, …values)` is the plain function, for where no hook fits**: a store, a mapper, a title that
may have no key at all (`AppBar`).

Never at module scope: a `const LABEL = i18n('x')` there runs while the module is imported, which is
before the phrases are set, and would freeze `#x#` for the session. A module constant holds **keys** —
`STATE_KEYS` in `ThemeSwitcher` — never resolved strings.

The shell's keys: `app.*`, `nav.*`, `sections.*` and `sectionMount.*` for the frame's states,
`notifications.*`, `theme.*`, and `admin.tool.*`, which XP resolves from `main.yaml` rather than the
UI. A section's phrases are the provider's own: they arrive through its schema and never enter this
bundle, and nothing here builds a key from a section id.

## Sections

**A section is not code in this app.** It is an admin extension on the `settings.section` interface,
shipped by the app that owns it and discovered at runtime — `entities/extension` fetches the rows,
`AppShell` builds the rail from them, and `SectionMounts` mounts each one into a shadow root. There
is no section registry and no per-section route: `app/model/router.ts` holds one `$slug/$` template,
and the sub-path under the slug belongs to the section. `docs/extensions/docs.md` is the contract;
`docs/extensions/host-facts.md` is what the shell does today.

Nothing in `widgets/`, `features/`, `entities/` or `shared/` may enumerate the sections, switch on a
section key, or assume how many there are.
