# UI tests

Browser tests of the Settings shell with the sections it hosts: WebdriverIO 10 + Mocha against a real
XP with the app deployed, Chrome driven over WebDriver. What a section does inside its own screen is
tested in the provider's suite (`app-applications/ui-tests`, `app-users/ui-tests`); this one covers
what the shell owns and what only shows with the shell and the providers together.

## What is covered

- `specs/no.admin.applications.spec.js` — an account with `Administration Console Login` alone
  opens the Settings app and gets the shell's empty state: `No administration applications` with
  its hint, a rail without items and nothing mounted, by the XP menu and by a section's direct link.
- `specs/sections.rail.navigation.spec.js` — the Settings app opened from the XP menu lists every
  section in its order and opens the first; a click on a rail item moves the active item
  (`data-status`, `aria-current`), the app bar title, the browser tab and the url together; no
  section in the url, `#/` and a path no section answers to all land on the first section.
- `specs/content.security.policy.spec.js` — the page carries the `Content-Security-Policy`
  baseline, and a cold load of the shell logs no violation; the sections are walked in their
  providers' suites. A last test requests an image from another origin and expects the violation in
  the same log, so the check above cannot pass on a log that records nothing.
- `specs/deep.link.query.string.spec.js` — a deep link `#/<section>/<sub-path>?<query>` opens its
  section with the url kept as typed; the rail item of the section left remembers the query string
  with the sub-path, and a click on the active item resets it. Runs on the sections of the test
  application, which read neither, so it is the shell's part alone; the same on a section that
  selects an item by its sub-path is in `app-users` and `app-applications`.
- `specs/theme.and.locale.spec.js` — `<html lang>` is the shell's language; the theme chosen in the
  app bar repaints the shell, the section shown and the sections kept hidden, a section mounted
  afterwards is born in it, and it survives a reload. Runs on the sections of the test application,
  as an account holding its `Admin Test Provider App` role.
- `specs/test.provider.admin.role.spec.js` — an account with `Administration Console Login` and
  `Admin Test Provider App` gets the three sections of the test application and no other; each opens
  by its rail item and by its url with its title in the app bar and the browser tab, and its page
  shows `Administrator <kind> Extension`. The url of a section the account may not open lands on
  its first one.

The test application is `Test ADFS ID Provider` (`com.enonic.uitest:adfs-idprovider`, repository
`enonic/uitest-adfs-provider`): three `settings.section` extensions that belong to no provider of
the product — Test User, Test Group and Test Role Extension — gated by the roles the application
creates when it starts. `:ui-tests:downloadApps` copies it into `home/deploy`, after checking that
the jar it resolved has the extensions: the application is a SNAPSHOT, and one built before they
were added carries the same version.

What a role sees in the sections of the product — read-only Users, `Users Administrator`,
`Administrator` and Applications — is tested where those sections live, in `app-users/ui-tests` and
`app-applications/ui-tests`, as are keeping a section alive and the ended session.

`page_objects/` are the page objects of what the shell renders and of the test application:
`menu.sections.rail.js` is the rail, `app.shell.js` the app bar, the theme switcher and the section
mounts, `sections.empty.js` the empty state, `test.extension.page.js` a page of the test
application. A section renders inside its own shadow root, so its page object locates with CSS
through `section.page.js`; XPath cannot cross a shadow root. `home.page.js` and `login.page.js` are
XP's own pages.

`libs/users.items.builder.js` makes the test data, `libs/settings.utils.js` the flows the specs
share: log in and out, open the Settings app at a section or a hash, create and delete principals
through the GraphQL API of `app-users`.

## Running

The suite is a Gradle subproject of this repository and a pnpm project of its own (its
`pnpm-workspace.yaml` keeps it out of the root workspace, its `pnpm-lock.yaml` pins the wdio
toolchain). The whole run — unpack an XP distro, put the app in it, start the server, run the specs,
write the Allure report, stop the server — is one task from the repository root:

```bash
./gradlew build
./gradlew :ui-tests:testSettingsApp
```

The first command makes `build/libs/app-settings.jar`, which `:ui-tests:deployApp` copies over the
one the distro bundles in `system/40`; pass `-PappUrl=<url>` to deploy another build. The sections
come with the distro. The XP version is `xpVersion` of `gradle.properties`; a test application the
suite needs goes under `apps` in `build.gradle` and lands in `home/deploy`.

The server listens on 8080, so an XP already running there has to be stopped first — or used as it
is, at `base.url` of `browser.properties`:

```bash
pnpm --dir ui-tests install
pnpm --dir ui-tests run test_settings:wdio_chrome
```

The report lands in `ui-tests/build/reports/allure-report`, screenshots in
`ui-tests/build/reports/screenshots`.

On GitHub the `ui-tests` job of `.github/workflows/gradle.yml` runs the same Gradle task after
`build`, with the jar that job uploaded, and keeps `ui-tests/build/reports` as an artifact.
