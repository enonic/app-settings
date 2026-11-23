const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const shellChecks = require('../libs/shell.checks');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');
const TestExtensionPage = require('../page_objects/test.extension.page');

describe("shared.module.access.spec - the sections of one application share one module, taken from the first of them the visitor may open: with the application's first section closed to the visitor, the others still mount", function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  // The shell points every section of an application at the module of the application's first
  // section. The first of the test application, by `config.order`, is open to its admin role
  // alone, so for the viewer the module has to come from the first one left - a module url behind
  // the closed section would not load.
  const OPEN = appConst.TEST_SECTIONS.filter((section) => section.openToViewer);
  const CLOSED = appConst.TEST_SECTIONS.filter((section) => !section.openToViewer);
  const mountOf = (section) => `div[data-component='SectionMount'][data-section='${section.id}']`;

  async function assertClosedSectionsAreAbsent() {
    const menuSectionsRail = new MenuSectionsRail();
    for (const section of CLOSED) {
      assert.ok(
        !(await menuSectionsRail.isSectionButtonDisplayed(section.title)),
        `'${section.title}' should not be in the rail`,
      );
      const mounts = await settingsUtils.getBrowser().$$(mountOf(section));
      assert.equal(mounts.length, 0, `'${section.title}' should not be mounted`);
    }
  }

  it('GIVEN the viewer account is logged in WHEN the Settings app has been opened THEN the sections open to the viewer should be in the rail AND the section open to the admin role alone should be neither in the rail nor in the DOM', async () => {
    // 1. The test application declares what this spec needs: its first section is a closed one.
    assert.ok(
      CLOSED.includes(appConst.TEST_SECTIONS[0]),
      'The first test section should be closed',
    );
    assert.ok(OPEN.length >= 2, 'Two test sections should be open to the viewer');
    // 2. Log in as the fixed account holding 'Test Provider App' and open the Settings app.
    const menuSectionsRail = await settingsUtils.navigateToSettingsApp(appConst.ACCOUNT.VIEWER);
    await shellChecks.assertFirstSectionIsShown();
    await settingsUtils.saveScreenshot('viewer_rail');
    // 3. Verify the rail: the open sections in their order, the closed one missing.
    assert.deepEqual(
      shellChecks.testSectionsAmong(await menuSectionsRail.getSectionNames()),
      OPEN.map((section) => section.title),
    );
    await assertClosedSectionsAreAbsent();
  });

  it('GIVEN the viewer account is logged in WHEN each section open to the viewer has been clicked in the rail THEN the section should be mounted AND its page should be loaded with the text for the viewer', async () => {
    let menuSectionsRail = new MenuSectionsRail();
    // The first of them last: its click is then a switch from another section as well.
    for (const section of [...OPEN.slice(1), OPEN[0]]) {
      await menuSectionsRail.clickOnSectionButton(section.title);
      // 1. The section is shown and the shared module has rendered its page into the mount.
      await shellChecks.assertTestSectionIsShown(section);
      // 2. The page reached the section's own endpoint: the module is shared, the base url is not.
      assert.equal(await new TestExtensionPage(section).waitForViewerText(), section.viewerText);
    }
    await assertClosedSectionsAreAbsent();
  });

  it('GIVEN the viewer account is logged in WHEN the Settings app has been loaded anew at the url of each section open to the viewer THEN the section should be mounted AND its page should be loaded', async () => {
    let appShell = new AppShell();
    for (const section of OPEN) {
      // A cold load: the module is imported for this section alone, nothing mounted before it.
      await settingsUtils.openSettingsByHash(`#/${section.path}`);
      await shellChecks.assertTestSectionIsShown(section);
      assert.equal(await new TestExtensionPage(section).waitForViewerText(), section.viewerText);
      assert.deepEqual(
        (await appShell.getSectionMounts()).map((mount) => mount.section),
        [section.id],
      );
    }
  });

  it('GIVEN the viewer account is logged in WHEN the url of the section open to the admin role alone has been opened THEN the first section of the rail should be opened instead AND the closed section should not be mounted', async () => {
    for (const section of CLOSED) {
      await settingsUtils.openSettingsByHash(`#/${section.path}`);
      const first = await shellChecks.assertFirstSectionIsShown();
      assert.notEqual(first, section.title);
    }
    await assertClosedSectionsAreAbsent();
    await settingsUtils.saveScreenshot('viewer_closed_section_url');
  });
});
