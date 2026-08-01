---
paths:
  - '**/*.api.ts'
  - 'src/main/resources/assets/js/shared/api/**'
  - 'src/main/resources/apis/**'
---

# Requests

## Client side

`entities/<domain>/api/*.api.ts` is the only place in the frontend that talks to the server.
Widgets, pages and features call entity commands; they never call `fetch`. No entity exists yet —
this is the shape the first one establishes.

Client code runs in the browser: it can only reach the server over HTTP. `/lib/xp/*` is available to
server-side code alone, so an api file talks to an endpoint, never to an XP lib.

```ts
export function fetchApplications(): ResultAsync<Application[], AppError> {
  return requestJson<ApplicationDto[]>(apiUrl()).map((dtos) => dtos.map(toApplication));
}
```

- Use `requestJson` / `requestOptionalJson` from `shared/api`. They return
  `ResultAsync<T, AppError>` — errors are values, not throws. Do not add a second http helper.
- Wire DTOs stay inside the api segment. Map to the domain types from `model/<domain>.types.ts` before
  returning; the rest of the app never sees a DTO shape.
- Api urls come from the tool config (`shared/config`), never hardcoded or assembled from
  `window.location`.
- Pass an `AbortSignal` for anything a user can retrigger (search, paging) and cancel the previous
  request.
- **One request to this app at a time.** XP gives an application a single-threaded GraalJS context, so
  overlapping requests into our own JS serialize at best and throw at worst.
  `requestGraphQl` enforces it with a single-flight queue; a second app-owned api must go through that
  same queue rather than adding its own. It is not a performance device — ask for everything a screen
  needs in one document, with several root fields and aliases, instead of firing parallel queries.
- Surface failures as state: the store keeps `status: 'loading' | 'ready' | 'error'` and the widget
  renders it. No `alert`, no silent `catch`.

## Server side

The app owns no HTTP API yet — `main.yaml` lists only foreign ones (`admin:event`,
`admin:extension`, `com.enonic.xp.app.main:events`). When a section needs its own, it goes in
`src/main/resources/apis/<name>/` as `<name>.yaml` + `<name>.ts`:

- `kind: API`, `allow: role:system.admin`, no `mount:` — an admin-tool API is authorized by being
  listed in `admin/tools/main/main.yaml`, where it is referenced by its bare name.
- Expose the url through `lib/config.ts` so the client reads it from the tool config. An app-owned
  api is addressed as `apiUrl({ api: `${app.name}:<name>` })`; the existing `apis.events` entry uses
  the foreign form `apiUrl({ api: 'admin:event', type: 'websocket' })`.
- Route by subpath: `request.path.slice(request.contextPath.length)`.
- Wrap handlers in `adminOnly()` from `lib/auth.ts`.
- Return `{ status, body }` with a JSON body; on failure include `{ message }` — `shared/api` reads
  that field for the error text.
- Never log or echo secrets: passwords, keys, tokens.

Adding an XP lib needs `include xplibs.<name>` in `build.gradle`, a double in `src/test/mocks/`, and
an alias in the `test.alias` block of `vite.config.ts`.
