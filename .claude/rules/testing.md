---
paths:
  - '**/*.test.{ts,tsx}'
---

# Testing

Vitest through `vp test`, config in the `test` block of `vite.config.ts`. Tests sit next to their
subject as `<file>.test.ts`. Both sides of the app are covered by the same run: client code under
`assets/js`, server modules under `src/main/resources/lib`.

**The environment is `node`, and no DOM library is installed — by decision, not by omission.**
Component rendering is not tested. Keep the testable part of a widget in a pure helper next to it (as
`shared/i18n/i18n.store.ts` keeps `localize`): row mapping, action `enabled` predicates, overflow and
sort computations all belong outside the component, where they can be asserted directly. Adding
`happy-dom` and a Preact testing library would be its own issue, never a line in a feature PR.

## Shape

Arrange-act-assert, `describe` per unit, `it` naming the observable behaviour in present tense —
`it('resolves 204 to undefined without parsing')`, not `it('should resolve …')`.

```ts
import { describe, expect, it, vi } from 'vitest';

describe('requestJson', () => {
  it('fails with the server-supplied message on an error status', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('{"message":"nope"}', { status: 500 }));

    const result = await requestJson('/api');

    expect(result.isErr()).toBe(true);
  });
});
```

## Mocking

- `vi` from vitest, and `vi.restoreAllMocks()` in `afterEach` whenever a global was replaced.
- XP libs resolve to the doubles in `src/test/mocks/` through the `test.alias` block in
  `vite.config.ts`. A new XP lib needs its double added there before any server test can import it.
- `vi.useFakeTimers()` plus `await vi.runAllTimersAsync()` for debounced behaviour — the list refresh
  debounce is the case that will need it.

## What to cover

Pure logic: mappers into view models, `enabled(ctx)` of every toolbar action, store commands, api
response mapping, formatting helpers. Assert on values and on error results, not on the fact that a
mock was called.
