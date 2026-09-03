---
paths:
  - '**/*.api.ts'
  - 'src/main/resources/assets/js/shared/api/**'
---

# Requests

## Client side

**An `api/` segment is the only place in the frontend that talks to the server** —
`entities/<domain>/api/*.api.ts`. Nothing else calls `fetch`, and no component does I/O. The shell
has one request of its own: discovery, `entities/extension/api/extensions.api.ts`, which reads the
`admin:extension` api for the `settings.section` rows. Everything a section loads is the section's,
over its own extension prefix, and never passes through here.

Client code runs in the browser: it can only reach the server over HTTP. `/lib/xp/*` is available to
server-side code alone, so an api file talks to an endpoint, never to an XP lib.

```ts
export function fetchSectionExtensions(
  signal?: AbortSignal,
): ResultAsync<SectionExtension[], AppError> {
  return requestJson<ExtensionDto[]>(url, { signal }).map((dtos) => dtos.map(toSectionExtension));
}
```

- Everything goes through `shared/api`, which returns `ResultAsync<T, AppError>` — errors are values,
  not throws. `requestJson` is the one helper; do not add a second http helper.
- Wire DTOs stay inside the api segment. Map to the domain types from `model/<domain>.types.ts` before
  returning; the rest of the app never sees a DTO shape.
- Api urls come from the tool config (`shared/config`), never hardcoded or assembled from
  `window.location`.
- Pass an `AbortSignal` for anything that can be retriggered and cancel the previous request:
  rediscovery on a burst of application events is the case.
- Surface failures as state: the store keeps a status and the widget renders it — `sections.failed`
  when discovery could not be asked. No `alert`, no silent `catch`.

## Server side

The shell owns no HTTP API. `main.yaml` lists the apis the page mounts — `admin:extension`,
`admin:events`, `com.enonic.xp.app.main:events`, and `server:app` for the Applications section, which
XP checks against the page's descriptor rather than the caller's (`docs/extensions/docs.md` § Data).
A section's data plane is served by its provider under the extension prefix.

Should the shell ever need an api of its own, it goes in `src/main/resources/apis/<name>/` as
`<name>.yaml` + `<name>.ts`: `kind: API`, `allow: role:system.admin`, no `mount:`, listed by its bare
name in `main.yaml`, its url exposed through `lib/config.ts` as
`apiUrl({ api: `${app.name}:<name>` })`, handlers guarded by `isAdmin()` from `lib/auth.ts`, and a
JSON body with `{ message }` on failure — `shared/api` reads that field for the error text. Never
log or echo secrets.

Adding an XP lib needs `include xplibs.<name>` in `build.gradle`, a double in `src/test/mocks/`, and
an alias in the `test.alias` block of `vite.config.ts`.
