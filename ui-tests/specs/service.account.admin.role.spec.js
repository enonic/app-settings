const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const userItemsBuilder = require('../libs/users.items.builder');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const ApplicationsPage = require('../page_objects/applications/applications.page');

describe("service.account.admin.role.spec - an account with 'Administrator' gets every section, 'Applications' among them, and its toolbar: 'Install' enabled, the actions on a selection disabled until there is one", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // 'Administration Console Login' lets the account into XP admin; 'Administrator' passes every
  // section's access rules, and 'Applications' is open to it alone.
  const ROLES = [appConst.SYSTEM_ROLES.ADMIN_CONSOLE, appConst.SYSTEM_ROLES.ADMINISTRATOR];
  const NEW_ACCOUNT = userItemsBuilder.buildServiceAccount({
    displayName: userItemsBuilder.generateRandomName('account'),
    password: appConst.PASSWORD.MEDIUM,
    roles: ROLES,
  });
  const APPLICATIONS = appConst.EXTENSIONS.APPLICATIONS;
  const BUTTON = ApplicationsPage.BUTTON;
  let ACCOUNT;

  it("GIVEN SU is logged in WHEN an account with 'Administrator' role has been created via the API THEN SU should be logged out", async () => {
    // 1. Log in as SU; the API is called from the XP home page with its session.
    await settingsUtils.doLogin('su', 'password');
    // 2. Create the account through the API.
    ACCOUNT = await settingsUtils.createServiceAccountViaApi(NEW_ACCOUNT);
    // 3. Log out.
    await settingsUtils.doLogout();
  });

  it("GIVEN the new account is logged in WHEN the Settings app has been opened THEN 'Applications' item should be displayed in the rail along with the sections of Users", async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // 1. Log in as the account made above and open the Settings app from the XP menu.
    await settingsUtils.navigateToSettingsApp(ACCOUNT.id, ACCOUNT.password);
    await menuSectionsRail.waitForSectionButtonDisplayed(APPLICATIONS);
    await settingsUtils.saveScreenshot('rail_administrator');
    // 2. Verify that every section is listed - whatever order their providers put them in.
    const actual = await menuSectionsRail.getSectionNames();
    assert.deepEqual([...actual].sort(), Object.values(appConst.EXTENSIONS).sort());
  });

  it("GIVEN the account is logged in WHEN 'Applications' item has been clicked THEN 'Install' button should be enabled AND 'Uninstall', 'Start' and 'Stop' should be disabled", async () => {
    let menuSectionsRail = new MenuSectionsRail();
    let applicationsPage = new ApplicationsPage();
    // 1. Open the section by its rail item: the url follows.
    await menuSectionsRail.clickOnSectionButton(APPLICATIONS);
    assert.equal(
      await settingsUtils.getBrowser().getUrl(),
      settingsUtils.getSectionUrl(APPLICATIONS),
    );
    await settingsUtils.waitForSectionScreenLoaded(APPLICATIONS);
    await applicationsPage.waitForLoaded();
    await settingsUtils.saveScreenshot('applications_administrator');
    // 2. Verify the four buttons of the toolbar, and that there is no read-only banner.
    assert.deepEqual(await applicationsPage.getToolbarButtonLabels(), Object.values(BUTTON));
    assert.ok(
      !(await applicationsPage.isReadOnlyBannerDisplayed()),
      "'Read-only mode' banner should not be displayed for 'Administrator'",
    );
    // 3. Install needs no selection: it is enabled.
    await applicationsPage.waitForToolbarButtonEnabled(BUTTON.INSTALL);
    // 4. Nothing is selected, so the actions on a selection are disabled.
    for (const label of [BUTTON.UNINSTALL, BUTTON.START, BUTTON.STOP]) {
      await applicationsPage.waitForToolbarButtonDisabled(label);
    }
  });

  it("GIVEN the account is logged in WHEN 'Applications' has been opened by its direct link THEN the section should be active in the rail AND the toolbar should be in the same state", async () => {
    let applicationsPage = new ApplicationsPage();
    // 1. Load the app at '.../com.enonic.xp.app.settings/main#/applications'.
    const menuSectionsRail = await settingsUtils.openSectionByUrl(APPLICATIONS);
    await menuSectionsRail.waitForSectionActive(APPLICATIONS);
    await applicationsPage.waitForLoaded();
    // 2. Install is enabled, the rest are disabled.
    await applicationsPage.waitForToolbarButtonEnabled(BUTTON.INSTALL);
    for (const label of [BUTTON.UNINSTALL, BUTTON.START, BUTTON.STOP]) {
      await applicationsPage.waitForToolbarButtonDisabled(label);
    }
  });

  // The account is deleted by SU - it could do so itself, but a cleanup should not depend on what
  // is under test.
  after(async () => {
    if (ACCOUNT === undefined) {
      return;
    }
    await settingsUtils.doLogout();
    await settingsUtils.doLogin('su', 'password');
    await settingsUtils.deletePrincipalsViaApi(ACCOUNT);
  });
});
