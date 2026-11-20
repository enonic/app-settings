const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');

describe('sections.rail.navigation.spec - the rail lists the sections in their order, the first one opens by default, and a click moves the active item, the app bar title, the browser tab and the url together', function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // Every section, in the order their providers put them in (`config.order`, then the key).
  const SECTIONS = [
    appConst.EXTENSIONS.APPLICATIONS,
    appConst.EXTENSIONS.SERVICE_ACCOUNTS,
    appConst.EXTENSIONS.USERS,
    appConst.EXTENSIONS.GROUPS,
    appConst.EXTENSIONS.ROLES,
    appConst.EXTENSIONS.ID_PROVIDERS,
  ];
  const FIRST_SECTION = SECTIONS[0];
  // What the rail lists for SU, who passes every section's access rules: the six above, then the
  // three of the test application the suite deploys (test.provider.admin.role.spec walks those).
  const RAIL_SECTIONS = [
    ...SECTIONS,
    ...appConst.TEST_PROVIDER.SECTIONS.map((section) => section.title),
  ];

  // The four things that name the section shown, and that they name the same one.
  async function assertSectionIsShown(section) {
    const menuSectionsRail = new MenuSectionsRail();
    const appShell = new AppShell();
    await menuSectionsRail.waitForSectionActive(section);
    // 1. The rail: this item is the active one and the current page, and no other is.
    assert.deepEqual(await menuSectionsRail.getActiveSectionNames(), [section]);
    assert.deepEqual(await menuSectionsRail.getCurrentPageSectionNames(), [section]);
    // 2. The app bar, the browser tab and the url.
    await appShell.waitForAppBarTitle(section);
    await appShell.waitForDocumentTitle(appConst.documentTitle(section));
    await appShell.waitForUrl(settingsUtils.getSectionUrl(section));
    // 3. The section's own screen, and that it is the only mount on show.
    await settingsUtils.waitForSectionScreenLoaded(section);
    const displayed = (await appShell.getSectionMounts()).filter((mount) => mount.displayed);
    assert.deepEqual(displayed, [
      { section: settingsUtils.getSectionId(section), active: true, displayed: true },
    ]);
  }

  it('GIVEN SU is logged in WHEN the Settings app has been opened from the XP menu THEN every section should be listed in the rail in its order AND the first one should be opened', async () => {
    // 1. Log in and click on the Settings link in the XP menu.
    await settingsUtils.navigateToSettingsApp('su', 'password');
    let menuSectionsRail = new MenuSectionsRail();
    await menuSectionsRail.waitForSectionActive(FIRST_SECTION);
    await settingsUtils.saveScreenshot('settings_opened');
    // 2. Verify the rail: its heading and the sections, in order.
    assert.equal(await menuSectionsRail.getRailTitle(), 'Settings');
    assert.deepEqual(await menuSectionsRail.getSectionNames(), RAIL_SECTIONS);
    // 3. Verify that the first section is the one opened.
    await assertSectionIsShown(FIRST_SECTION);
  });

  it('GIVEN the Settings app is opened WHEN each item of the rail has been clicked THEN the item should become the active one AND the app bar title, the browser tab and the url should follow', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // The first section is the one shown, so the walk ends on it: its click is a switch too.
    for (const section of [...SECTIONS.slice(1), FIRST_SECTION]) {
      await menuSectionsRail.clickOnSectionButton(section);
      await assertSectionIsShown(section);
    }
  });

  it('GIVEN SU is logged in WHEN the Settings app has been opened with no section in the url THEN the first section should be opened', async () => {
    for (const hash of ['', '#/']) {
      await settingsUtils.openSettingsByHash(hash);
      await assertSectionIsShown(FIRST_SECTION);
    }
  });

  it('GIVEN SU is logged in WHEN the Settings app has been opened at a path no section answers to THEN the first section should be opened', async () => {
    // 'users-admin' starts with a section's path without being it: '/users' must not answer for it.
    for (const hash of [
      '#/no-such-section',
      '#/no-such-section/with/a/sub-path',
      '#/users-admin',
    ]) {
      await settingsUtils.openSettingsByHash(hash);
      await assertSectionIsShown(FIRST_SECTION);
    }
    await settingsUtils.saveScreenshot('unknown_section_path');
  });

  it('GIVEN SU is logged in WHEN each section has been opened by its direct link THEN that section should be opened', async () => {
    for (const section of SECTIONS) {
      await settingsUtils.openSectionByUrl(section);
      await assertSectionIsShown(section);
    }
  });
});
