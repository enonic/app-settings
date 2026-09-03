# Enonic XP - Settings App

[![Actions Status](https://github.com/enonic/app-settings/workflows/Gradle%20Build/badge.svg)](https://github.com/enonic/app-settings/actions)
[![License][license-image]][license-url]

The Settings admin tool of [Enonic XP](https://github.com/enonic/xp): one page that discovers the
administration sections other applications provide and hosts them side by side. Applications comes
from `app-applications`; Users, Groups, Roles and ID Providers come from `app-users`. This app owns
the frame — the app bar, the section rail, the theme, notifications, the url — and renders nothing
of a section itself.

A section is an admin extension on the `settings.section` interface. How one is discovered, mounted,
routed and revoked is documented in [`docs/extensions/`](docs/extensions/docs.md).

The app is a system app. Its admin tool is open to everyone who can reach XP admin; which sections a
visitor sees is decided by each extension's own access rules, server-side.

## Requirements

- JDK 25
- Enonic XP 8.1

Node and pnpm are **not** required: Gradle downloads the pinned versions (Node 24.18.0, pnpm 10.33.4) into `.gradle/` on the first build.

## Usage

Copy the built JAR to `$XP_HOME/deploy`, or let Gradle do it:

```
./gradlew deploy
```

Nothing shows until a provider is installed: with none, the tool reports that no administration
applications are available.

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

The frontend under `src/main/resources/assets/js`:

```
app/                 shell, router, the host object handed to each section, section mounting
widgets/             the rail, the mount slot, the empty state, the toast list
features/            theme switcher
entities/extension/  discovery of the sections and their live rediscovery
shared/              api client, config, i18n, admin events, notifications, the mount contract
```

Tests live next to the code they cover, as `*.test.ts`.

The server side of `src/main/resources`:

```
admin/tools/main/   the single admin tool: descriptor, controller, page template
lib/                tool config, i18n, the admin guard, and the admin events hub topics the shell publishes
i18n/               the shell's phrases
```

## Routing

The left rail has one entry per discovered section. Hash history is used, and a section is routed as
`/{slug}/{sub-path}`, where the sub-path belongs to the section itself and the shell only carries it
— so a deep link survives a reload. A path no section answers to goes to the first one.

<!-- Links -->

[license-url]: LICENSE
[license-image]: https://img.shields.io/github/license/enonic/app-settings.svg 'GPL 3.0'
