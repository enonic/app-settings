---
paths:
  - 'src/main/resources/assets/js/**'
---

# Frontend structure

Feature-Sliced-like layout, modelled on Content Studio v6. Imports run one way:

```
app  →  pages  →  widgets / features  →  entities  →  shared
```

No exceptions. A widget that needs app-level data takes it as a prop and declares its own view model
for it — `SectionRail` owns `SectionRailItem` and `AppShell` passes `SECTIONS` in, rather than the
widget reaching up into `app/navigation`. Same rule for domain data: pass a view model, never import
from `entities/`.

| Layer                | Holds                                                      | Never                                 |
| -------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `app/`               | shell, router, navigation registry, bootstrap              | domain logic                          |
| `pages/<section>/`   | composition, entity → view-model mapping, route glue       | reusable logic                        |
| `widgets/`           | section-agnostic composite blocks                          | domain words, `entities/` imports     |
| `features/<action>/` | one user action: dialog, wizard, command                   | being imported by `widgets/`          |
| `entities/<domain>/` | types, api, stores, hook                                   | UI beyond a domain-specific row/badge |
| `shared/`            | api client, config, i18n, server events, selection, format | importing anything above              |

## File names

| Kind         | Pattern                                  |
| ------------ | ---------------------------------------- |
| Component    | `PascalCase.tsx`, one component per file |
| Store        | `<name>.store.ts`, atoms prefixed `$`    |
| Api          | `<domain>.api.ts`                        |
| Types        | `<domain>.types.ts`                      |
| Hook         | `use<Thing>.ts`                          |
| Pure helpers | `<name>.ts`, named exports only          |
| Test         | `<file>.test.ts(x)` next to its subject  |

Folders are `kebab-case`. `shared/` and `entities/` slices are consumed through an `index.ts` barrel;
components under `widgets/` and `pages/` are imported by file path — no barrels there. A barrel never
re-exports a store's internals.

## Components

`export function Name()` — not arrow consts assigned to a variable. Props type named
`<Name>Props`, declared with `type`, exported when the component is exported. No default exports.

## i18n

Every user-visible string goes through `useI18n()`; `i18n/phrases.properties` is grouped by section
with banner comments, and phrases stay sentence-case even where the UI uppercases them.

Existing keys: `nav.<section>` for the rail, `section.<section>.title` for the section heading,
app-shell keys ungrouped (`app.displayName`, `item.id`, `serverEvents.connected`), and
`admin.tool.*`, which XP resolves from `main.yaml` rather than the UI. New section keys extend that
scheme as `<section>.<area>.<name>` — `users.details.roles`, `applications.action.install`.

## Sections

A section needs an entry in `app/navigation.ts`, a folder in `pages/`, and one `sectionRoutes(...)`
line plus its two component imports in `app/router.tsx` — the helper is generic, the registration is
not. The section screen itself is a contract: see `docs/browse-framework.md`.
