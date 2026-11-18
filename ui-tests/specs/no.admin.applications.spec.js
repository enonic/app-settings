const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const userItemsBuilder = require('../libs/users.items.builder');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const SectionsEmpty = require('../page_objects/sections.empty');

describe("no.admin.applications.spec - an account with 'Administration Console Login' alone may open the Settings app but none of its sections: the rail is empty and 'No administration applications' is shown", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The one role lets the account into XP admin, and the Settings tool is open to everyone who gets
  // that far; no section's access rules include it.
  const NEW_ACCOUNT = userItemsBuilder.buildServiceAccount({
    displayName: userItemsBuilder.generateRandomName('account'),
    password: appConst.PASSWORD.MEDIUM,
    roles: [appConst.SYSTEM_ROLES.ADMIN_CONSOLE],
  });
  const ALL_SECTIONS = Object.values(appConst.EXTENSIONS);
  let ACCOUNT;

  async function assertNoSections() {
    const sectionsEmpty = new SectionsEmpty();
    const menuSectionsRail = new MenuSectionsRail();
    await sectionsEmpty.waitForLoaded();
    // 1. The message and, since the visitor is not an administrator, the hint under it.
    assert.equal(await sectionsEmpty.getMessage(), appConst.SECTIONS_EMPTY.MESSAGE);
    assert.equal(await sectionsEmpty.getHint(), appConst.SECTIONS_EMPTY.HINT);
    assert.equal(await sectionsEmpty.getRole(), 'status');
    // 2. The rail is there with its heading, and without a single item.
    assert.equal(await menuSectionsRail.getRailTitle(), 'Settings');
    assert.deepEqual(await menuSectionsRail.getSectionNames(), []);
    for (const section of ALL_SECTIONS) {
      assert.ok(
        !(await menuSectionsRail.isSectionButtonDisplayed(section)),
        `'${section}' item should not be displayed in the rail`,
      );
    }
    // 3. Nothing is mounted, and the app bar has no section to title.
    assert.equal(await sectionsEmpty.getSectionMountsCount(), 0, 'No section should be mounted');
    assert.equal(await sectionsEmpty.getAppBarTitle(), '');
  }

  it("GIVEN SU is logged in WHEN an account with 'Administration Console Login' alone has been created via the API THEN SU should be logged out", async () => {
    // 1. Log in as SU; the API is called from the XP home page with its session.
    await settingsUtils.doLogin('su', 'password');
    // 2. Create the account through the API.
    ACCOUNT = await settingsUtils.createServiceAccountViaApi(NEW_ACCOUNT);
    // 3. Log out.
    await settingsUtils.doLogout();
  });

  it("GIVEN the new account is logged in WHEN the Settings app has been opened THEN 'No administration applications' should be shown with its hint AND the rail should have no items", async () => {
    // 1. Log in as the account made above and open the Settings app from the XP menu.
    await settingsUtils.navigateToSettingsApp(ACCOUNT.id, ACCOUNT.password);
    await new SectionsEmpty().waitForLoaded();
    await settingsUtils.saveScreenshot('no_administration_applications');
    // 2. Verify the message, the empty rail and that nothing is mounted.
    await assertNoSections();
  });

  // To this account every section's path is one no section answers to, and there is no first
  // section to fall back on.
  it("GIVEN the account is logged in WHEN the direct link to a section has been opened THEN 'No administration applications' should be shown AND the section should not be mounted", async () => {
    for (const section of [appConst.EXTENSIONS.ROLES, appConst.EXTENSIONS.APPLICATIONS]) {
      await settingsUtils.openSectionByUrl(section);
      await assertNoSections();
    }
    await settingsUtils.saveScreenshot('no_administration_applications_by_url');
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
