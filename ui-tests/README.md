# UI tests

Browser tests of the Settings shell with the sections it hosts: WebdriverIO 10 + Mocha against a real
XP with the app deployed, Chrome driven over WebDriver. What a section does inside its own screen is
tested in the provider's suite (`app-applications/ui-tests`, `app-users/ui-tests`); this one covers
what the shell owns and what only shows with the shell and the providers together.

## What is covered

- `specs/service.account.read.only.mode.spec.js` — an account with `Administration Console Login`,
  `Content Manager Administrator` and `Users App` is created through the API, logs in and gets the
  Service Accounts section read-only: the `Read-only mode` banner in place of the toolbar, and no
  Edit buttons in the details panel. The same account then walks every section it may open, by the
  rail and by direct link (`…/com.enonic.xp.app.settings/main#/roles`), each read-only; Applications
  is not in its rail, and the link to it lands on the first section.
- `specs/service.account.users.administrator.role.spec.js` — the opposite case: an account with
  `Administration Console Login` and `Users Administrator` gets the toolbar in place of the banner,
  the Edit buttons enabled in the details panel, and New and Delete enabled over a selected item in
  every section of Users.
- `specs/no.admin.applications.spec.js` — an account with `Administration Console Login` alone
  opens the Settings app and gets the shell's empty state: `No administration applications` with
  its hint, a rail without items and nothing mounted, by the XP menu and by a section's direct link.
- `specs/service.account.admin.role.spec.js` — an account with `Administration Console Login` and
  `Administrator` gets every section in the rail, Applications among them, and its toolbar with
  Install enabled and Uninstall, Start and Stop disabled while nothing is selected.
- `specs/sections.rail.navigation.spec.js` — the Settings app opened from the XP menu lists every
  section in its order and opens the first; a click on a rail item moves the active item
  (`data-status`, `aria-current`), the app bar title, the browser tab and the url together; no
  section in the url, `#/` and a path no section answers to all land on the first section.
- `specs/sections.keep.alive.spec.js` — a section left for another stays mounted and hidden with its
  search term; its rail item carries the sub-path it was left at and leads back to the selected
  item; a click on the active item resets the path; a deep link to an item survives a reload.
- `specs/content.security.policy.spec.js` — the page carries the `Content-Security-Policy`
  baseline, and walking every section, by direct link and by the rail, logs no violation. A last
  test requests an image from another origin and expects the violation in the same log, so the
  check above cannot pass on a log that records nothing.
- `specs/session.ended.spec.js` — with the Settings app open in one tab, a logout in another tab
  raises `Your session has ended` in the first: the only notification, it does not hide by itself,
  and its Reload button leads to the login page.
- `specs/browser.history.navigation.spec.js` — the browser's Back and Forward move between the
  sections and the sub-path one was left at; the rail, the app bar, the browser tab and the section
  follow the url, and the sections walked through stay mounted.
- `specs/deep.link.query.string.spec.js` — a deep link `#/<section>/<sub-path>?<query>` opens its
  section with the item selected and the url kept as typed; the rail item of the section left
  remembers the query string with the sub-path.
- `specs/theme.and.locale.spec.js` — `<html lang>` is the shell's language; the theme chosen in the
  app bar reaches the shell, the section shown and the sections kept hidden, a section mounted
  afterwards is born in it, and it survives a reload.

`page_objects/` are the page objects, copied from `app-users/ui-tests` and kept to what the specs
here use: `browse.page.js` and `details.panel.js` are the base classes of a section's browse screen
and details panel, `menu.sections.rail.js` is the shell's rail. Every section renders inside its own
shadow root, so its page objects locate with CSS through `section.page.js`; XPath cannot cross a
shadow root.

`libs/users.items.builder.js` makes the test data, `libs/settings.utils.js` the flows the specs
share: log in and out, open a section, create and delete principals through the GraphQL API of
`app-users`.

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
