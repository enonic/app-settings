# Enonic XP - Settings App

[![Actions Status](https://github.com/enonic/app-settings/workflows/Gradle%20Build/badge.svg)](https://github.com/enonic/app-settings/actions)
[![License][license-image]][license-url]

A unified frame for the administration sections of [Enonic XP](https://github.com/enonic/xp): Applications, Users, Groups, Roles and ID Providers.

The app is a system app, and its admin tool is restricted to `role:system.admin`.

## Requirements

- JDK 25
- Enonic XP 8.1

Node and pnpm are **not** required: Gradle downloads the pinned versions (Node 24.18.0, pnpm 10.33.4) into `.gradle/` on the first build.

## Usage

Copy the built JAR to `$XP_HOME/deploy`, or let Gradle do it:

```
./gradlew deploy
```

## Configuration

Optional, in `$XP_HOME/config/com.enonic.xp.app.settings.cfg`:

| Key                        | Default                                 | Effect                                                                                                                                       |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `applications.managedMode` | off                                     | `true` puts the Applications section in managed mode: it lists what is installed and offers nothing that changes it. Any other value is off. |
| `marketApiUrl`             | `https://market.enonic.com/api/graphql` | Where Enonic Market is read from.                                                                                                            |

Both values are trimmed, so trailing whitespace in the file is harmless.

Managed mode is for installs where applications arrive through a deploy pipeline rather than through
this tool. It is a UI affordance, not a security boundary — the platform's own `server:app` api stays
open to `role:system.admin` — and it leaves the other four sections alone.

## Building

```
./gradlew build
```

This runs the whole pipeline: format, lint, type-check of both frontend and server code, tests, asset bundling, server-side TypeScript compilation, and packaging into `build/libs/app-settings.jar`.

To skip the checks while iterating:

```
./gradlew build -x pnpmCheck
```

### Environment

Production is the default. For a development build — sourcemaps, no minification:

```
./gradlew build -Penv=dev
```

> The value must be exactly `dev`. `-Penv=development` still produces an unminified build, but the XP Gradle plugin writes the `X-Source-Paths` manifest header only for `dev`, so that JAR will not support live reload.

## Development

`-Penv=dev` records the absolute paths of `src/main/resources` and `build/resources/main` into the JAR manifest. XP then serves resources from those directories instead of from the JAR, so the deployed JAR can sit anywhere — rebuilding the sources is enough.

Full loop — checks, build and continuous redeploy:

```
./gradlew dev
```

Frontend-only loop, much faster, rebuilds assets into `build/resources/main` on every save:

```
pnpm dev
```

`pnpm dev` covers `assets/` only. Files under `src/main/resources` such as `main.html`, descriptors and i18n phrases are read straight from source and need no rebuild, while server-side TypeScript needs `pnpm pack:server` or the Gradle loop.

## Checks and tests

```
pnpm check        # format, lint, types, tests — what CI runs
pnpm check:fix    # same, but fixes formatting in place
pnpm test         # tests only
pnpm test:watch
```

## Source layout

The frontend under `src/main/resources/assets/js` follows a Feature-Sliced-like layout, modelled on Content Studio v6:

```
app/         application shell and router
pages/       one slice per section
widgets/     composite blocks
features/    user-facing actions
entities/    domain models
shared/      api client, stores, reusable utilities
```

Tests live next to the code they cover, as `*.test.ts`.

The server side of `src/main/resources`:

```
admin/tools/main/   the single admin tool: descriptor, controller, page template
lib/                shared server modules (auth guard, i18n, tool config)
i18n/               phrase bundles
```

## Routing

The left toolbar has one entry per section, declared in `assets/js/app/navigation.ts`.
Each section is routed as `/{section}` with a deep-linkable item route
`/{section}/$id`; `/` redirects to the first section. Hash history is used, so an item
view survives a reload and can be linked to.

<!-- Links -->

[license-url]: LICENSE
[license-image]: https://img.shields.io/github/license/enonic/app-settings.svg 'GPL 3.0'
