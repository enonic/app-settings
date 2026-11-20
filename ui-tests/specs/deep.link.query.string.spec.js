const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const userItemsBuilder = require('../libs/users.items.builder');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');
const TestExtensionPage = require('../page_objects/test.extension.page');

describe("deep.link.query.string.spec - a deep link '#/<section>/<sub-path>?<query>' opens its section with the sub-path and the query string kept verbatim, and the shell remembers both when the section is left", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The sections of 'Test ADFS ID Provider': pages that read neither a sub-path nor a query string,
  // so what happens to those in the url is the shell's doing alone. What a section of the product
  // makes of its own sub-path is tested in its provider (app-users, app-applications).
  const [USERS, GROUPS, ROLES] = appConst.TEST_PROVIDER.SECTIONS;
  const NEW_ACCOUNT = userItemsBuilder.buildServiceAccount({
    displayName: userItemsBuilder.generateRandomName('account'),
    password: appConst.PASSWORD.MEDIUM,
    roles: [appConst.SYSTEM_ROLES.ADMIN_CONSOLE, appConst.TEST_PROVIDER.ROLE.ADMIN],
  });
  const QUERY = '?foo=bar&x=1';
  // '#/test-provider-groups/some/sub-path?foo=bar&x=1'
  const DEEP_HASH = `#/${GROUPS.path}/some/sub-path${QUERY}`;
  const urlOf = (hash) => settingsUtils.getSettingsUrl() + hash;
  let ACCOUNT;

  // The section is the one shown - the rail, the app bar and its page - at exactly this url.
  async function assertSectionIsShownAt(section, hash) {
    const menuSectionsRail = new MenuSectionsRail();
    const appShell = new AppShell();
    const page = new TestExtensionPage(section);
    await menuSectionsRail.waitForSectionActive(section.title);
    await appShell.waitForAppBarTitle(section.title);
    await page.waitForLoaded();
    assert.equal(await page.waitForAdministratorText(), section.administratorText);
    await appShell.waitForUrl(urlOf(hash));
  }

  it("GIVEN an account of the test application is logged in WHEN the Settings app has been loaded at '#/<section>/<sub-path>?<query>' THEN that section should be opened AND the url should be kept as it was typed", async () => {
    // 1. Make the account as SU, then log in as it.
    await settingsUtils.doLogin('su', 'password');
    await settingsUtils.waitForRoleExists(appConst.TEST_PROVIDER.ROLE.ADMIN);
    ACCOUNT = await settingsUtils.createServiceAccountViaApi(NEW_ACCOUNT);
    await settingsUtils.doLogout();
    await settingsUtils.navigateToSettingsApp(ACCOUNT.id, ACCOUNT.password);
    // 2. Load the page anew at the deep link: not the first section, a sub-path and a query string.
    await settingsUtils.openSettingsByHash(DEEP_HASH);
    // 3. Verify the section and that the url was not rewritten.
    await assertSectionIsShownAt(GROUPS, DEEP_HASH);
    await settingsUtils.saveScreenshot('deep_link_query_string');
  });

  it('GIVEN a section is opened at a sub-path with a query string WHEN another section has been opened THEN the rail item of the section left should carry the sub-path with the query string AND lead back to the same url', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // 1. The item of the section shown leads to its root - a click on it is a reset.
    assert.equal(await menuSectionsRail.getSectionHref(GROUPS.title), `#/${GROUPS.path}`);
    // 2. Leave the section.
    await menuSectionsRail.clickOnSectionButton(USERS.title);
    await assertSectionIsShownAt(USERS, `#/${USERS.path}`);
    // 3. Verify that the rail item remembers the query string along with the sub-path.
    assert.equal(await menuSectionsRail.getSectionHref(GROUPS.title), DEEP_HASH);
    // 4. Return: the same url.
    await menuSectionsRail.clickOnSectionButton(GROUPS.title);
    await assertSectionIsShownAt(GROUPS, DEEP_HASH);
  });

  it('GIVEN a section is opened at a sub-path with a query string WHEN its rail item, already active, has been clicked THEN the url should be reset to the root of the section', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    await menuSectionsRail.clickOnSectionButton(GROUPS.title);
    await assertSectionIsShownAt(GROUPS, `#/${GROUPS.path}`);
  });

  it("GIVEN the account is logged in WHEN the Settings app has been loaded at a section's root with a query string THEN that section should be opened AND the query string should be kept", async () => {
    const hash = `#/${ROLES.path}${QUERY}`;
    await settingsUtils.openSettingsByHash(hash);
    await assertSectionIsShownAt(ROLES, hash);
  });

  // The query string belongs to the section it was typed for: with no such section it goes with
  // the path, and the first section is opened at its own root.
  it('GIVEN the account is logged in WHEN the Settings app has been loaded at a path no section answers to, with a query string THEN the first section should be opened at its root', async () => {
    await settingsUtils.openSettingsByHash(`#/no-such-section${QUERY}`);
    await assertSectionIsShownAt(USERS, `#/${USERS.path}`);
  });

  // The account is deleted by SU: the one made here cannot reach the API.
  after(async () => {
    if (ACCOUNT === undefined) {
      return;
    }
    await settingsUtils.doLogout();
    await settingsUtils.doLogin('su', 'password');
    await settingsUtils.deletePrincipalsViaApi(ACCOUNT);
  });
});
