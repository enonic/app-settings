---
paths:
  - 'src/main/resources/assets/js/**'
---

# Frontend structure

Feature-Sliced Design layout. Content Studio v6 is where it was learned from, not an authority —
where its own tree deviates, these rules win. Imports run one way:

```
app  →  pages  →  widgets / features  →  entities  →  shared
```

No exceptions. A widget that needs app-level data takes it as a prop and declares its own view model
for it — `SectionRail` owns `SectionRailItem` and `AppShell` passes `SECTIONS` in, rather than the
widget reaching up into `app/navigation`. Same rule for domain data: pass a view model, never import
from `entities/`.

| Layer                | Holds                                                                     | Never                                 |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| `app/`               | shell, router, navigation registry, bootstrap                             | domain logic                          |
| `pages/<section>/`   | composition, entity → view-model mapping, route glue                      | reusable logic                        |
| `widgets/`           | section-agnostic composite blocks                                         | domain words, `entities/` imports     |
| `features/<action>/` | one user action: dialog, wizard, command                                  | being imported by `widgets/`          |
| `entities/<domain>/` | one domain slice: `api/`, `model/`, sometimes `ui/`                       | UI beyond a domain-specific row/badge |
| `shared/`            | api client, config, i18n, server events, notifications, selection, format | importing anything above              |

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
components under `widgets/` and `pages/` are imported by file path — no barrels there. A barrel never
re-exports a store's internals.

## Slices and segments

A slice under `entities/` or `features/` is split into segments, and the segment names are fixed:

```
entities/principal/
  api/users.api.ts          requests, one file per subdomain
  api/groups.api.ts
  model/users.store.ts      facts, computed, commands
  model/users.service.ts    start()/stop() lifecycle, when the slice needs one
  model/principal.types.ts  domain types
  model/usePrincipals.ts    the hook pages call
  ui/PrincipalBadge.tsx     only when the domain really ships a component
  index.ts                  the slice's public API
```

- `api/` and `model/` exist even for a single file. One judgement call fewer, and the I/O boundary
  stays visible in the tree.
- `ui/` only when a component exists; per the layer table that stays rare.
- Segment files keep their suffix — `*.api.ts`, `*.store.ts`, `*.service.ts`, `*.types.ts` — so the
  rule globs above and a plain grep keep finding them.
- Slice granularity follows the domain, not the section. Users, groups, roles and ID providers share
  `PrincipalKey`, provider membership and each other's member lists, so they are one `principal`
  slice with a file per subdomain; applications is its own. Four principal slices would force either
  cross-slice imports, which the import direction forbids, or domain types in `shared/`, where they
  do not belong.

Content Studio v6 is inconsistent here — `api/` everywhere, `model/` only in slices that grew, stores
at slice root in `entities/application` and `entities/principal`. Follow the rule above instead; it is
the shape we would want in a library shared with it.

## Components

`export function Name()` — not arrow consts assigned to a variable. Props type named
`<Name>Props`, declared with `type`, exported when the component is exported. No default exports.

## i18n

Every user-visible string goes through `useI18n()`; `i18n/phrases.properties` is grouped by section
with banner comments, and phrases stay sentence-case even where the UI uppercases them.

Existing keys: `nav.<section>` for the rail, `section.<section>.title` for the section heading,
`browse.*` for the section-agnostic browse widgets, app-shell keys ungrouped (`app.displayName`,
`item.id`, `serverEvents.connected`), and `admin.tool.*`, which XP resolves from `main.yaml` rather
than the UI. New section keys extend that scheme as `<section>.<area>.<name>` — `users.details.roles`,
`applications.action.install`. A widget resolves the `labelKey` it is handed; it never builds a key
from a section id.

## Sections

A section needs an entry in `app/navigation.ts`, a folder in `pages/`, and one `sectionRoutes(...)`
line plus its two component imports in `app/router.tsx` — the helper is generic, the registration is
not. The section screen itself is a contract: see `docs/browse-framework.md`.

The set of sections is open-ended: further admin applications are expected to move into this app.
`app/navigation.ts` is the only place that knows which sections exist — nothing in `widgets/`,
`features/`, `entities/` or `shared/` may enumerate them, switch on a section id, or assume how many
there are.
