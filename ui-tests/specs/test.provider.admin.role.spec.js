const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const userItemsBuilder = require('../libs/users.items.builder');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');
const TestExtensionPage = require('../page_objects/test.extension.page');

describe("test.provider.admin.role.spec - an account with 'Admin Test Provider App' gets the three sections of the test application and no other: each opens by its rail item and by its url, titled and with the administrator's text", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // 'Administration Console Login' lets the account into XP admin; 'Admin Test Provider App' is
  // the role the test application gates its three sections by, and the one its pages answer with
  // 'Administrator ... Extension'.
  const ROLES = [appConst.SYSTEM_ROLES.ADMIN_CONSOLE, appConst.TEST_PROVIDER.ROLE.ADMIN];
  const NEW_ACCOUNT = userItemsBuilder.buildServiceAccount({
    displayName: userItemsBuilder.generateRandomName('account'),
    password: appConst.PASSWORD.MEDIUM,
    roles: ROLES,
  });
  const SECTIONS = appConst.TEST_PROVIDER.SECTIONS;
  const TITLES = SECTIONS.map((section) => section.title);
  const FIRST_SECTION = SECTIONS[0];
  const urlOf = (section) => `${settingsUtils.getSettingsUrl()}#/${section.path}`;
  let ACCOUNT;

  // The section is the one shown: the rail, the app bar, the browser tab and the url name it, and
  // its page carries its heading and the line for an administrator of the test application.
  async function assertSectionIsShown(section) {
    const menuSectionsRail = new MenuSectionsRail();
    const appShell = new AppShell();
    const page = new TestExtensionPage(section);
    // 1. The rail: this item is the active one, and no other is.
    await menuSectionsRail.waitForSectionActive(section.title);
    assert.deepEqual(await menuSectionsRail.getActiveSectionNames(), [section.title]);
    assert.deepEqual(await menuSectionsRail.getCurrentPageSectionNames(), [section.title]);
    // 2. The app bar, the browser tab and the url.
    await appShell.waitForAppBarTitle(section.title);
    await appShell.waitForDocumentTitle(appConst.documentTitle(section.title));
    await appShell.waitForUrl(urlOf(section));
    // 3. The page of the section: its heading and the administrator's text, not the viewer's.
    await page.waitForLoaded();
    assert.equal(await page.getTitle(), section.title);
    assert.equal(await page.waitForAdministratorText(), section.administratorText);
    assert.ok(
      !(await page.isViewerTextDisplayed()),
      `'${section.title}' - the viewer's text should not be displayed`,
    );
    // 4. It is the only mount on show.
    const displayed = (await appShell.getSectionMounts()).filter((mount) => mount.displayed);
    assert.deepEqual(displayed, [{ section: section.id, active: true, displayed: true }]);
  }

  it("GIVEN SU is logged in WHEN an account with 'Admin Test Provider App' role has been created via the API THEN SU should be logged out", async () => {
    // 1. Log in as SU; the API is called from the XP home page with its session.
    await settingsUtils.doLogin('su', 'password');
    // 2. The role is made by the test application when it starts.
    await settingsUtils.waitForRoleExists(appConst.TEST_PROVIDER.ROLE.ADMIN);
    // 3. Create the account through the API.
    ACCOUNT = await settingsUtils.createServiceAccountViaApi(NEW_ACCOUNT);
    // 4. Log out.
    await settingsUtils.doLogout();
  });

  it('GIVEN the new account is logged in WHEN the Settings app has been opened THEN only the three items of the test application should be displayed in the rail AND the first one should be opened', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // 1. Log in as the account made above and open the Settings app from the XP menu.
    await settingsUtils.navigateToSettingsApp(ACCOUNT.id, ACCOUNT.password);
    await menuSectionsRail.waitForSectionActive(FIRST_SECTION.title);
    await settingsUtils.saveScreenshot('test_provider_admin_rail');
    // 2. Verify the rail: the three sections in their order, and nothing else.
    assert.deepEqual(await menuSectionsRail.getSectionNames(), TITLES);
    for (const section of Object.values(appConst.EXTENSIONS)) {
      assert.ok(
        !(await menuSectionsRail.isSectionButtonDisplayed(section)),
        `'${section}' item should not be displayed in the rail`,
      );
    }
    // 3. Verify the section opened by default: the title and 'Administrator User Extension'.
    await assertSectionIsShown(FIRST_SECTION);
  });

  it('GIVEN the account is logged in WHEN each item of the rail has been clicked THEN its section should be opened with its title AND the administrator text should be displayed on the page', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // The first section is the one shown, so the walk ends on it: its click is a switch too.
    for (const section of [...SECTIONS.slice(1), FIRST_SECTION]) {
      await menuSectionsRail.clickOnSectionButton(section.title);
      await assertSectionIsShown(section);
    }
    await settingsUtils.saveScreenshot('test_provider_admin_by_rail');
  });

  it('GIVEN the account is logged in WHEN each section has been opened by its url THEN that section should be opened with its title AND the administrator text should be displayed on the page', async () => {
    for (const section of SECTIONS) {
      // Load the page anew at '.../com.enonic.xp.app.settings/main#/test-provider-users', ...
      await settingsUtils.openSettingsByHash(`#/${section.path}`);
      await assertSectionIsShown(section);
    }
    await settingsUtils.saveScreenshot('test_provider_admin_by_url');
  });

  // The sections of Users and 'Applications' are not this account's: their paths are ones no
  // section answers to, and the first section it does have is opened instead.
  it('GIVEN the account is logged in WHEN the url of a section it has no access to has been opened THEN the first section of the test application should be opened instead', async () => {
    for (const path of [appConst.SECTION_PATH.ROLES, appConst.SECTION_PATH.APPLICATIONS]) {
      await settingsUtils.openSettingsByHash(`#/${path}`);
      await assertSectionIsShown(FIRST_SECTION);
    }
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
