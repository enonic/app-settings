---
paths:
  - 'src/main/resources/assets/js/**/*.tsx'
---

# @enonic/ui and Tailwind

Read the component source before using a compound component from `@enonic/ui` — several fail
silently rather than at typecheck. Source: `../npm-enonic-ui/src/components/`; installed types:
`node_modules/@enonic/ui/dist/types/components/`. The shell composes little of the library — `Button`,
`Tooltip` and `Toast` — and the browse-screen gotchas the sections hit live with the providers'
copies of this rule and in the toolkit's `docs/browse-framework.md`.

## Components that need exact composition

- **`Toast` sorts its children by identity.** Only a `Toast.Button` reaches the action column;
  everything else lands in the content column, so `Toast.Close` composed by hand renders in the
  wrong place and `withClose` is the only way to the close button — along with its hardcoded English
  `aria-label`. `Toast.Icon` renders `null` and reaches the root through context, so it has to be a
  child rather than a prop, and it is what decides the root's `role`. `widgets/notifications/`
  is the worked example.
- **`Tooltip`** portals into the `PortalProvider` layer; in the shell that is `document.body`, and
  inside a section's shadow root it is the section's `AppRoot`. Nothing here renders inside a
  section.
- `SplitView` does **not** exist in `@enonic/ui` at all: the `split-view/` folder in the library
  checkout is empty and no commit in its history ever added one. Two-column layouts are flexbox.

## Shadow roots

Every section renders inside an open shadow root the shell creates. The shell's own chrome stays in
the light DOM: toasts, the app bar and the rail reserve the top z-index band so they stack above any
section overlay. Theme tokens are CSS custom properties on `:root` and inherit through the boundary;
the `dark` class does not, which is why a section applies the resolved theme itself through
`host.theme`.

## Tailwind

- v4, configured in `assets/css/index.css`; no `tailwind.config.js`. Design tokens come from
  `@enonic/ui/preset.css`, imported there.
- Use the semantic tokens (`bg-surface-primary`, `text-subtle`, `border-bdr-soft`, `text-alt`), not
  raw palette values like `bg-gray-100`.
- Class order is enforced by oxfmt (`sortTailwindcss`) — let `pnpm check:fix` sort it.
- No inline `style` for anything a token or utility can express.
- Both light and dark themes must work; theme comes from `shared/app-state/theme.store.ts`.
