---
paths:
  - '**/*.api.ts'
  - 'src/main/resources/assets/js/shared/api/**'
  - 'src/main/resources/apis/**'
---

# Requests

## Client side

**An `api/` segment is the only place in the frontend that talks to the server** —
`entities/<domain>/api/*.api.ts` for one domain, and `pages/<section>/api/*.api.ts` for the one query a
screen spanning several domains needs. Nothing else calls `fetch`, and no component does I/O: widgets and
components call commands. Four entity slices exist: `application`, `principal` with a file per
subdomain, `project`, and `market` — what Enonic Market offers, which is a different domain from what
this instance has installed.

Client code runs in the browser: it can only reach the server over HTTP. `/lib/xp/*` is available to
server-side code alone, so an api file talks to an endpoint, never to an XP lib.

```ts
export function fetchApplications(signal?: AbortSignal): ResultAsync<Application[], AppError> {
  return requestGraphQl<ApplicationsResult>(APPLICATIONS_ROOT, { signal }).map(({ applications }) =>
    applications.map(toApplication),
  );
}
```

- Everything goes through `shared/api`, which returns `ResultAsync<T, AppError>` — errors are values, not
  throws. `requestGraphQl` for reads (see the two bullets below); `requestJson` / `requestOptionalJson`
  for an app-owned endpoint that is not GraphQL, which today means none. Do not add a second http helper.
- **`requestUploadJson` in `shared/api/upload.ts` is the one exception, and the only `XMLHttpRequest` in
  the app.** `fetch` cannot observe upload progress and request-body streaming is Chrome-only, so the jar
  upload — the single multipart call there is — goes over XHR. `RequestOptions.body` stays JSON-only.
  Content Studio v6's file of the same name is the same helper: keep the two portable, and put nothing
  else in it.
- Wire DTOs stay inside the api segment. Map to the domain types from `model/<domain>.types.ts` before
  returning; the rest of the app never sees a DTO shape.
- Api urls come from the tool config (`shared/config`), never hardcoded or assembled from
  `window.location`.
- Pass an `AbortSignal` for anything a user can retrigger (search, paging) and cancel the previous
  request. A request still queued when its signal aborts is dropped before it reaches the network, so
  holding Refresh down costs the server one round trip rather than one per press.
- **One request to this app at a time.** XP gives an application a single-threaded GraalJS context, so
  overlapping requests into our own JS serialize at best and throw at worst. `requestGraphQl` holds that
  line; a second app-owned api must go through the same queue rather than adding its own.
- **Ask for a root field and a selection, not a whole document** — `requestGraphQl({ field, selection })`.
  The transport names the operation and builds the query, so no api file writes boilerplate. It fails when
  its own field did not arrive, which is what keeps the wire types non-nullable.
- **A screen that needs several domains asks for them in one request.** One request is in flight at a
  time, so three calls are three round trips. `requestGraphQlRoots([...roots], 'RolesScreen', signal)`
  puts them in one document and hands back `data` with `null` where a field failed — it decides nothing.
- **That composition belongs to the page, not to an entity.** Slices on one layer may not import each
  other, so the page is the lowest layer where several domains meet: `pages/<section>/api/<section>-screen.api.ts`
  composes the roots the entities export (`ROLES_ROOT`, `ID_PROVIDERS_ROOT`) and names no field of its own,
  and `pages/<section>/model/<section>.screen.ts` fans the answer out into the stores, one verdict per
  domain, and owns the cancelling. A domain that a screen reads beside another exports its root and its
  mapper; `fetchX` stays only where a section reads that domain alone.
- **`requestGraphQlDocument` is for what a root and a selection cannot express** — arguments, variables, an
  alias, a mutation. Any error fails it, and a null field passes through, which makes it the right home
  for a field whose `null` is a legitimate answer.
- Reuse a field list by interpolating a shared constant into the selection, not with a GraphQL fragment:
  the transport composes selections, not definitions.
- Surface failures as state: the store keeps `status: 'loading' | 'ready' | 'error'` and the widget
  renders it. No `alert`, no silent `catch`.
- That covers loading something. The outcome of a command the user triggered — start, delete,
  install — has no screen of its own to fail on, so it goes to `notifyError` from
  `shared/notifications`. A load failure never becomes a notification, and a command failure never
  becomes list state.

## Server side

The app owns one HTTP API, `apis/graphql/`, listed first under `apis:` in `main.yaml` beside the foreign
ones (`server:app`, `admin:event`, `admin:extension`, `com.enonic.xp.app.main:events`).

**The jar upload is not a second one.** It goes to core's `server:app/install`, which takes the jar as
multipart under the form field `file` and is already `role:system.admin` — the same universal API this
app calls for `installUrl`, `start`, `stop` and `uninstall`. No binary endpoint here could serve it
anyway: GraalJS puts no bytes on the wire (`docs/platform-facts.md`).

Should a second app-owned API ever be warranted, it goes in `src/main/resources/apis/<name>/` as
`<name>.yaml` + `<name>.ts`, and follows what graphql already does:

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
