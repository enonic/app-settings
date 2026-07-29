---
paths:
  - '**/*.tsx'
---

# Preact

The app runs on Preact 10. `react`, `react-dom` and `react-dom/client` are aliased to
`preact/compat` in both `vite.config.ts` and `tsconfig.json`, because `@enonic/ui` is written against
the React types.

## Where imports come from

```ts
import { useCallback, useEffect, useState } from 'preact/hooks'; // hooks and runtime
import { h, render } from 'preact'; // bootstrap only, in main.ts
import type { JSX } from 'preact'; // JSX.Element as a return type
import type { ReactNode } from 'react'; // prop types that reach @enonic/ui slots
```

Runtime code imports from `preact`, not from `react` — nothing here needs the compat runtime
directly. Prop types are the exception: a slot that ends up inside an `@enonic/ui` component must be
typed `ReactNode`, which resolves through the alias to `preact.ComponentChild`. Do not type such a
slot `ComponentChildren`; the two are not interchangeable in the library's props.

## Components

Hook order inside a component: refs and store hooks, then state and memos, then effects, then
computed class names, then early returns, then JSX.

```tsx
export function BrowseList({ rows, className }: BrowseListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selected = useStore($selected);

  if (rows.length === 0) return <BrowseListEmpty />;

  return <div ref={listRef} className={className} />;
}
```

- Early return instead of `<>{ready && …}</>`.
- Minimize `useEffect`: derive from stores and props first; an effect is for subscriptions and
  imperative DOM work. `useServerEvent` already wraps the subscribe/unsubscribe pattern.
- `useCallback` / `useMemo` only where a dependency actually needs stability, as `useI18n` does.

## Known type friction

- `@enonic/ui` composes Radix Slot, whose ref type does not match Preact's `ForwardedRef`. It works
  at runtime; annotate with `@ts-expect-error` and a one-line reason. Never `as any`.
- TanStack Router probes React 19's `use` hook, which preact/compat lacks; the resulting bundler
  warning is silenced in `vite.config.ts` and is not a real problem.
