/**
 * The checks several specs make of the shell: that one section is the one shown, and that it is the
 * first of the rail. Both read the rail for what is there - the distro may add sections of its own,
 * and the specs pass with them and without them.
 */
const assert = require('node:assert');
const appConst = require('./app_const');
const settingsUtils = require('./settings.utils');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const AppShell = require('../page_objects/app.shell');
const TestExtensionPage = require('../page_objects/test.extension.page');

// The rail, the app bar, the browser tab and the mounts agree that `title` is the section shown,
// and the url is exactly `hash` on the tool's url.
async function assertShellShows(title, hash) {
  const menuSectionsRail = new MenuSectionsRail();
  const appShell = new AppShell();
  // 1. The rail: this item is the active one and the current page, and no other is.
  await menuSectionsRail.waitForSectionActive(title);
  assert.deepEqual(await menuSectionsRail.getCurrentPageSectionNames(), [title]);
  // 2. The app bar, the browser tab and the url.
  await appShell.waitForAppBarTitle(title);
  await appShell.waitForDocumentTitle(appConst.documentTitle(title));
  await appShell.waitForUrl(settingsUtils.getSettingsUrl() + hash);
  // 3. One mount is on show, and it is the active one.
  const displayed = await appShell.getDisplayedSectionMounts();
  assert.equal(displayed.length, 1, `One mount should be on show: ${JSON.stringify(displayed)}`);
  assert.ok(
    displayed[0].active,
    `The mount on show should be the active one: ${JSON.stringify(displayed[0])}`,
  );
  return displayed[0];
}

module.exports = {
  // The titles of the test application's sections among `names`, in the order `names` has them.
  testSectionsAmong(names) {
    const titles = appConst.TEST_SECTIONS.map((section) => section.title);
    return names.filter((name) => titles.includes(name));
  },

  // `section` (an entry of appConst.TEST_SECTIONS) is the one shown, at `hash` - its root unless
  // given - and its page has rendered inside its mount.
  async assertTestSectionIsShown(section, hash = `#/${section.path}`) {
    const mount = await assertShellShows(section.title, hash);
    assert.equal(mount.section, section.id);
    const page = new TestExtensionPage(section);
    await page.waitForLoaded();
    assert.equal(await page.getTitle(), section.title);
  },

  // The section shown is the first of the rail, at its root. Which one that is is read off the
  // rail, where the item of the section shown leads to its root.
  async assertFirstSectionIsShown() {
    const menuSectionsRail = new MenuSectionsRail();
    const [first] = await menuSectionsRail.getSectionNames();
    assert.ok(first, 'The rail should list a section');
    await menuSectionsRail.waitForSectionActive(first);
    await assertShellShows(first, await menuSectionsRail.getSectionHref(first));
    return first;
  },
};
