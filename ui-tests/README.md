# UI tests

Browser tests of the Settings shell: WebdriverIO 10 + Mocha against a real XP with the app deployed,
Chrome driven over WebDriver.

The suite depends on two things only: this app and the test application it deploys. The shell does
not know which sections are installed — it shows whatever implements `settings.section` — so no
spec opens, names or calls a section of another application, and the specs pass with such sections
in the rail and without them. What a section does inside its own screen is tested in the suite of
the application that adds it.

## What is covered

- `specs/sections.rail.navigation.spec.js` — the rail lists the sections of the test application in
  their order and the Settings app opens on the first section of the rail; a click on a rail item
  and a section's url move the active item (`data-status`, `aria-current`), the app bar title, the
  browser tab, the url and the page shown together; no section in the url, `#/`, a path no section
  answers to and a path that only starts with a section's all land on the first section.
- `specs/deep.link.query.string.spec.js` — a deep link `#/<section>/<sub-path>?<query>` opens its
  section with the url kept as typed; the rail item of the section left remembers the query string
  with the sub-path, and a click on the active item resets it.
- `specs/shared.module.access.spec.js` — the sections of one application share one module, taken
  from the first of them the visitor may open. Logged in as the viewer account, to which the test
  application's first section is closed: the open sections are in the rail, mount and load their
  page; the closed one is neither in the rail nor in the DOM, and its url opens the first section.
- `specs/no.admin.applications.spec.js` — an account no section's access rules include gets the
  shell's empty state: `No administration applications` with its hint, a rail without items and
  nothing mounted, whatever the path.
- `specs/theme.spec.js` — the theme chosen in the app bar repaints the shell, the section shown and
  the sections kept hidden, a section mounted afterwards is born in it, and it survives a reload.
- `specs/content.security.policy.spec.js` — the page carries the `Content-Security-Policy`
  baseline, and a cold load at a section logs no violation. A last test requests an image from
  another origin and expects the violation in the same log, so the check above cannot pass on a
  log that records nothing.

All but two run as SU, who passes the access rules of every section. SU can therefore never see an
empty rail or a closed section, and those two specs log in as accounts of the test application.

## The test application

`Test ADFS ID Provider` (`com.enonic.uitest:adfs-idprovider`, repository
`enonic/uitest-adfs-provider`) brings what the specs run on:

- three `settings.section` extensions — Test User, Test Group and Test Role Extension, in that
  order. The first is open to the application's admin role alone, the other two to its viewer role
  as well;
- two fixed accounts, made when the application starts, so no spec creates or deletes one:
  `test-provider-no-sections`, which holds `Administration Console Login` and nothing else, and
  `test-provider-viewer`, which holds the viewer role too.

`:ui-tests:downloadApps` copies the application into `home/deploy` before the server starts, so it
is installed with it, after checking that the jar it resolved has the sections and the accounts: the
application is a SNAPSHOT, and one built before they were added carries the same version.

## Layout

`page_objects/` are the page objects of what the shell renders and of the test application:
`menu.sections.rail.js` is the rail, `app.shell.js` the app bar, the theme switcher and the section
mounts, `sections.empty.js` the empty state, `test.extension.page.js` a page of the test
application. A section renders inside its own shadow root, so its page object locates with CSS
through `section.page.js`; XPath cannot cross a shadow root. `home.page.js` and `login.page.js` are
XP's own pages.

`libs/settings.utils.js` holds the flows the specs share — log in and out, open the Settings app
from the XP menu or at a hash — and `libs/shell.checks.js` the checks of which section is shown.
`libs/WebDriverHelper.js` starts the browser when a spec is run on its own with mocha, outside the
wdio runner.

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
one the distro bundles in `system/40`; pass `-PappUrl=<url>` to deploy another build. The XP version
is `xpVersion` of `gradle.properties`; a test application the suite needs goes under `apps` in
`build.gradle` and lands in `home/deploy`.

The server listens on 8080, so an XP already running there has to be stopped first — or used as it
is, at `base.url` of `browser.properties`:

```bash
pnpm --dir ui-tests install
pnpm --dir ui-tests run test_settings:wdio_chrome
```

The report lands in `ui-tests/build/reports/allure-report`, screenshots in
`ui-tests/build/reports/screenshots` — one per failed test, named `failed_<test>`.

On GitHub the `ui-tests` job of `.github/workflows/gradle.yml` runs the same Gradle task after
`build`, with the jar that job uploaded, and keeps `ui-tests/build/reports` as an artifact.
