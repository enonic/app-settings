---
paths:
  - 'src/main/resources/assets/js/**/*.tsx'
---

# @enonic/ui and Tailwind

Read the component source before using a compound component from `@enonic/ui` — several fail
silently rather than at typecheck. Source: `../npm-enonic-ui/src/components/`; installed types:
`node_modules/@enonic/ui/dist/types/components/`.

## Components that need exact composition

- **`SearchField` renders only `{children}`.** There is no default input — `<SearchField value
onChange />` with no children is an empty bordered box. Compose `<SearchField.Icon />`,
  `<SearchField.Input />`, `<SearchField.Clear />`. `SearchField.Input` hardcodes
  `aria-label='Search'` before spreading props, so an override works.
- **`ListItem` uses `findComponentByType`** and renders only `ListItem.Left`,
  `ListItem.Content` / `ListItem.DefaultContent` and `ListItem.Right`, in that order. Any other
  child is dropped silently.
- **`SelectableListItem` is just `ListItem` + a `Checkbox` in `Left`** with no way to stop the
  checkbox click from bubbling. Rows that navigate on click compose `ListItem` directly.
- **`Separator label="…"`** already applies `text-subtle uppercase tracking-wider` to the label — do
  not restate those, and keep the phrase sentence-case in `phrases.properties`.
- **`Avatar.Fallback`** renders only while `imageLoadingStatus` is `idle` or `error`; with no
  `Avatar.Image` the root starts `idle`, so a fallback-only avatar works.
- **`Toolbar`** is `Root` / `Container` / `Item` / `Separator` plus `ToggleGroup` / `ToggleItem`;
  `Container` requires `aria-label`, and `Item` wraps a focusable child with `asChild`. Roving
  tabindex and arrow-key navigation come from `Container` — do not reimplement them.
- `SplitView` does **not** exist in `@enonic/ui` at all: the `split-view/` folder in the library
  checkout is empty and no commit in its history ever added one. Two-column layouts are flexbox.

## Selected rows

`selected` on `ListItem` sets `bg-surface-selected text-alt` and `data-tone=inverse`, so any nested
text — meta cells, badges — needs `group-data-[tone=inverse]:text-alt` to stay readable on the dark
active row.

## Tailwind

- v4, configured in `assets/css/index.css`; no `tailwind.config.js`. Design tokens come from
  `@enonic/ui/preset.css`, imported there.
- Use the semantic tokens (`bg-surface-primary`, `text-subtle`, `border-bdr-soft`, `text-alt`), not
  raw palette values like `bg-gray-100`.
- Class order is enforced by oxfmt (`sortTailwindcss`) — let `pnpm check:fix` sort it.
- No inline `style` for anything a token or utility can express.
- Both light and dark themes must work; theme comes from `shared/app-state/theme.store.ts`.
