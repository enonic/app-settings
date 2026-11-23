const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const shellChecks = require('../libs/shell.checks');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');

describe('sections.rail.navigation.spec - the rail lists the sections in their order, the first one opens by default, and a click or a url moves the active item, the app bar title, the browser tab and the section shown together', function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The sections of the test application, in the order of their `config.order`. SU passes the
  // access rules of all three.
  const SECTIONS = appConst.TEST_SECTIONS;

  it('GIVEN SU is logged in WHEN the Settings app has been opened from the XP menu THEN the sections of the test application should be listed in the rail in their order AND the first section of the rail should be opened', async () => {
    // 1. Log in and click on the Settings link in the XP menu.
    const menuSectionsRail = await settingsUtils.navigateToSettingsApp();
    // 2. Verify that the first section of the rail is the one opened.
    await shellChecks.assertFirstSectionIsShown();
    await settingsUtils.saveScreenshot('settings_opened');
    // 3. Verify the rail: its heading and the three test sections, in order among whatever else
    //    the instance has.
    assert.equal(await menuSectionsRail.getRailTitle(), appConst.RAIL_TITLE);
    assert.deepEqual(
      shellChecks.testSectionsAmong(await menuSectionsRail.getSectionNames()),
      SECTIONS.map((section) => section.title),
    );
  });

  it('GIVEN the Settings app is opened WHEN each item of the test application has been clicked in the rail THEN the item should become the active one AND the app bar title, the browser tab, the url and the page should follow', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // Down the rail and back up, so every click is a switch from another section.
    for (const section of [...SECTIONS, ...[...SECTIONS].reverse().slice(1)]) {
      await menuSectionsRail.clickOnSectionButton(section.title);
      await shellChecks.assertTestSectionIsShown(section);
    }
  });

  it('GIVEN SU is logged in WHEN each section of the test application has been opened by its url THEN that section should be opened', async () => {
    for (const section of SECTIONS) {
      await settingsUtils.openSettingsByHash(`#/${section.path}`);
      await shellChecks.assertTestSectionIsShown(section);
    }
  });

  it('GIVEN SU is logged in WHEN the Settings app has been opened with no section in the url THEN the first section of the rail should be opened', async () => {
    for (const hash of ['', '#/']) {
      await settingsUtils.openSettingsByHash(hash);
      await shellChecks.assertFirstSectionIsShown();
    }
  });

  it('GIVEN SU is logged in WHEN the Settings app has been opened at a path no section answers to THEN the first section of the rail should be opened', async () => {
    for (const hash of [
      '#/no-such-section',
      '#/no-such-section/with/a/sub-path',
      // Starts with a section's path without being it: that section must not answer for it.
      `#/${SECTIONS[0].path}-admin`,
    ]) {
      await settingsUtils.openSettingsByHash(hash);
      await shellChecks.assertFirstSectionIsShown();
    }
    await settingsUtils.saveScreenshot('unknown_section_path');
  });
});
