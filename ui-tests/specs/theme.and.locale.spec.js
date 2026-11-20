const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const userItemsBuilder = require('../libs/users.items.builder');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');
const TestExtensionPage = require('../page_objects/test.extension.page');

describe("theme.and.locale.spec - the theme chosen in the app bar repaints the shell and every mounted section of the test application, shown or hidden, and survives a reload; the page's language is the shell's", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The sections of 'Test ADFS ID Provider': plain pages that style no text of their own, so the
  // colour their heading is painted in is the one the shell's theme hands down into the shadow root.
  const [USERS, GROUPS, ROLES] = appConst.TEST_PROVIDER.SECTIONS;
  const NEW_ACCOUNT = userItemsBuilder.buildServiceAccount({
    displayName: userItemsBuilder.generateRandomName('account'),
    password: appConst.PASSWORD.MEDIUM,
    roles: [appConst.SYSTEM_ROLES.ADMIN_CONSOLE, appConst.TEST_PROVIDER.ROLE.ADMIN],
  });
  let ACCOUNT;
  // What the light theme paints, to compare the dark one against and to return to.
  let LIGHT_TEXT_COLOR, LIGHT_APP_BAR_COLOR, DARK_TEXT_COLOR;

  async function openSection(section) {
    await new MenuSectionsRail().clickOnSectionButton(section.title);
    await new TestExtensionPage(section).waitForLoaded();
  }

  it("GIVEN an account of the test application is logged in WHEN the Settings app has been opened THEN 'lang' of the page should be the language of the shell's phrases", async () => {
    let appShell = new AppShell();
    // 1. Make the account as SU, then log in as it.
    await settingsUtils.doLogin('su', 'password');
    await settingsUtils.waitForRoleExists(appConst.TEST_PROVIDER.ROLE.ADMIN);
    ACCOUNT = await settingsUtils.createServiceAccountViaApi(NEW_ACCOUNT);
    await settingsUtils.doLogout();
    await settingsUtils.navigateToSettingsApp(ACCOUNT.id, ACCOUNT.password);
    await new TestExtensionPage(USERS).waitForLoaded();
    // 2. The browser asks for English (--lang=en) and the shell's phrases are English.
    assert.equal(await appShell.getHtmlLang(), 'en');
  });

  it('GIVEN two sections are mounted in the light theme WHEN the theme has been switched to dark THEN the shell, the section shown and the section kept hidden should all be repainted', async () => {
    let appShell = new AppShell();
    let usersPage = new TestExtensionPage(USERS);
    let groupsPage = new TestExtensionPage(GROUPS);
    // 1. Start from the light theme, with 'Test User Extension' mounted and left for
    //    'Test Group Extension'.
    await appShell.selectTheme('light');
    await openSection(GROUPS);
    assert.ok(!(await appShell.isShellDark()), 'The shell should be light to begin with');
    LIGHT_TEXT_COLOR = await groupsPage.getTitleColor();
    LIGHT_APP_BAR_COLOR = await appShell.getAppBarBackgroundColor();
    assert.equal(await usersPage.getTitleColor(), LIGHT_TEXT_COLOR);
    // 2. Switch to dark.
    await appShell.selectTheme('dark');
    await settingsUtils.saveScreenshot('theme_dark');
    // 3. Verify the shell: the class and what it paints.
    assert.ok(await appShell.isShellDark(), "The shell should carry the 'dark' class");
    assert.notEqual(await appShell.getAppBarBackgroundColor(), LIGHT_APP_BAR_COLOR);
    // 4. Verify the section shown: the theme crossed its shadow root, its text was repainted.
    await groupsPage.waitForTitleColorNot(LIGHT_TEXT_COLOR);
    DARK_TEXT_COLOR = await groupsPage.getTitleColor();
    // 5. Verify the section kept hidden: repainted with it, not on its return.
    assert.deepEqual(await appShell.getSectionMount(USERS.id), {
      section: USERS.id,
      active: false,
      displayed: false,
    });
    await usersPage.waitForTitleColor(DARK_TEXT_COLOR);
  });

  it('GIVEN the dark theme is selected WHEN a section not visited yet has been opened THEN it should be mounted in the dark theme', async () => {
    let appShell = new AppShell();
    assert.equal(await appShell.getSectionMount(ROLES.id), undefined);
    await openSection(ROLES);
    await new TestExtensionPage(ROLES).waitForTitleColor(DARK_TEXT_COLOR);
  });

  it('GIVEN the dark theme is selected WHEN the page has been loaded anew at the url of a section THEN the shell and the section should be dark from the start', async () => {
    let appShell = new AppShell();
    let groupsPage = new TestExtensionPage(GROUPS);
    await settingsUtils.openSettingsByHash(`#/${GROUPS.path}`);
    await groupsPage.waitForLoaded();
    assert.equal(await appShell.getStoredTheme(), 'dark');
    assert.ok(await appShell.isShellDark(), 'The shell should be dark after the reload');
    await groupsPage.waitForTitleColor(DARK_TEXT_COLOR);
    await settingsUtils.saveScreenshot('theme_dark_after_reload');
  });

  it('GIVEN the dark theme is selected WHEN the theme has been switched back to light THEN the shell and the mounted sections should be painted as they were', async () => {
    let appShell = new AppShell();
    // 1. Mount a second section, so one is shown and one is hidden.
    await openSection(USERS);
    await new TestExtensionPage(USERS).waitForTitleColor(DARK_TEXT_COLOR);
    // 2. Switch to light.
    await appShell.selectTheme('light');
    // 3. Verify the shell and both sections, down to the colours they had before.
    assert.ok(!(await appShell.isShellDark()), "The shell should drop the 'dark' class");
    assert.equal(await appShell.getAppBarBackgroundColor(), LIGHT_APP_BAR_COLOR);
    await new TestExtensionPage(USERS).waitForTitleColor(LIGHT_TEXT_COLOR);
    await new TestExtensionPage(GROUPS).waitForTitleColor(LIGHT_TEXT_COLOR);
  });

  // The choice lives in the browser's storage: forgotten, so a spec that follows in the same
  // session starts from the system theme. The account is deleted by SU.
  after(async () => {
    await new AppShell().clearStoredTheme();
    if (ACCOUNT === undefined) {
      return;
    }
    await settingsUtils.doLogout();
    await settingsUtils.doLogin('su', 'password');
    await settingsUtils.deletePrincipalsViaApi(ACCOUNT);
  });
});
