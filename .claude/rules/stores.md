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

- Stores are prefixed `$`: `$config`, `$sectionExtensions`, `$resolvedTheme`.
- One domain concept per file. If the file needs "and" to describe it, split it.
- Mutations are exported functions in the store file (`setTheme`, `setConfig`), not `.set()` calls
  from components.
- Keep types out of a store file, except its own state type and types only its own API uses —
  `i18n.store.ts` carries `PhraseValue` because nothing else does.
- Reload orchestration and subscriptions go in a sibling `<name>.service.ts` with `start()`/`stop()`,
  started from the app root — not in a component effect. `extensions.service.ts` is the case: it
  follows the hub's `applications` topic and rediscovers.

## Loading

- **A store file holds no transport.** Facts, `begin<Domain>Load()`, `receive<Domain>(result)` and
  pure commands over what it holds, nothing that calls an api.
- **A loader owns the request and the cancelling**, and reports through those two commands:
  `entities/extension/model/extensions.load.ts`.
- Prefer `onMount` for a store that owns a browser subscription, as `theme.store.ts` does for the
  system theme.
- Transport and parsing stay out of the store file: `config.store.ts` holds the `$config` atom and
  its setter, `config.ts` owns reading and validating the JSON island that feeds it.

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

## What crosses the host boundary

A store handed to a section is never the atom itself. `createSectionHost` wraps `$resolvedTheme` into
the contract's `Readable` — `get` plus a `listen`-backed `subscribe` — so revocation reaches the
guest's listeners and the guest never holds the shell's `set`. A `Readable` never calls back on
subscribe; that is the contract, and `createSectionHost.test.ts` pins it.
