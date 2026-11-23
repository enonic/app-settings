const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const SectionsEmpty = require('../page_objects/sections.empty');

describe("no.admin.applications.spec - an account no section's access rules include may open the Settings app but none of its sections: the rail is empty and 'No administration applications' is shown", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The Settings tool is open to everyone who can reach XP admin, and 'Administration Console
  // Login' is all this account holds. SU cannot stand in for it: SU passes every section's rules.
  const ACCOUNT = appConst.ACCOUNT.NO_SECTIONS;

  async function assertNoSections() {
    const sectionsEmpty = new SectionsEmpty();
    const menuSectionsRail = new MenuSectionsRail();
    await sectionsEmpty.waitForLoaded();
    // 1. The message and, since the visitor is not an administrator, the hint under it.
    assert.equal(await sectionsEmpty.getMessage(), appConst.SECTIONS_EMPTY.MESSAGE);
    assert.equal(await sectionsEmpty.getHint(), appConst.SECTIONS_EMPTY.HINT);
    assert.equal(await sectionsEmpty.getRole(), 'status');
    // 2. The rail is there with its heading, and without a single item.
    assert.equal(await menuSectionsRail.getRailTitle(), appConst.RAIL_TITLE);
    assert.deepEqual(await menuSectionsRail.getSectionNames(), []);
    // 3. Nothing is mounted, and the app bar has no section to title.
    assert.equal(await sectionsEmpty.getSectionMountsCount(), 0, 'No section should be mounted');
    assert.equal(await sectionsEmpty.getAppBarTitle(), '');
  }

  it("GIVEN the account with no section is logged in WHEN the Settings app has been opened THEN 'No administration applications' should be shown with its hint AND the rail should have no items", async () => {
    // 1. Log in as the fixed account and open the Settings app from the XP menu.
    await settingsUtils.navigateToSettingsApp(ACCOUNT);
    await new SectionsEmpty().waitForLoaded();
    await settingsUtils.saveScreenshot('no_administration_applications');
    // 2. Verify the message, the empty rail and that nothing is mounted.
    await assertNoSections();
  });

  // With no section there is no first one to fall back on, whatever the path.
  it("GIVEN the account with no section is logged in WHEN the Settings app has been loaded at a path THEN 'No administration applications' should be shown AND nothing should be mounted", async () => {
    for (const hash of ['#/', '#/no-such-section', '#/no-such-section/with/a/sub-path?foo=bar']) {
      await settingsUtils.openSettingsByHash(hash);
      await assertNoSections();
    }
  });
});
