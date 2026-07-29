---
paths:
  - '**/*.store.ts'
  - '**/*.store.tsx'
---

# Nanostores

## Store kinds

| Kind        | Type           | Mutated by                | Purpose                               |
| ----------- | -------------- | ------------------------- | ------------------------------------- |
| **Fact**    | `atom` / `map` | commands in the same file | single source of truth                |
| **Derived** | `computed`     | never                     | projection of fact stores             |
| **Signal**  | `atom`         | services, subscriptions   | ephemeral event, consumed and cleared |

A fact store never derives from another fact store — use `computed`. A signal store is consumed and
cleared, never cached.

## Conventions

- Stores are prefixed `$`: `$selected`, `$applications`, `$readOnly`.
- One domain concept per file. If the file needs "and" to describe it, split it.
- Mutations are exported functions in the store file (`setTheme`, `clear`), not `.set()` calls from
  components.
- Keep types out of a store file, except its own state type and types only its own API uses —
  `i18n.store.ts` carries `PhraseValue` because nothing else does.
- Reload orchestration and per-section subscriptions go in a sibling `<name>.service.ts` with
  `start()`/`stop()`, started from the app root — not in a component effect.
- Prefer `onMount` for a store that owns a browser subscription, as `theme.store.ts` does.
- Connection and transport logic stays out of the store file: `server-events.store.ts` holds the
  `$serverEventsConnected` atom and its setter, `server-events.ts` owns the websocket and calls that
  setter.

## Reading

```ts
// ❌ .get() in a render path — no re-render
const rows = $rows.get();

// ✅ reactive
const rows = useStore($rows);

// ✅ subscribe to specific keys of a map store
const { status } = useStore($state, { keys: ['status'] });
```

`.get()` is right in event handlers, inside store files, in helpers outside components, and in
one-time initialization.

## Section stores

Per-section state (selection, filter, paging cursor) lives in `pages/<section>/model/`. Domain data
lives in `entities/<domain>/model/*.store.ts`. A page store may read an entity store; never the
reverse.
