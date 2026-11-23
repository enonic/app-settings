const Page = require('./page');
const appConst = require('../libs/app_const');

// The rail on the left of the Settings app: its heading and one link per section the visitor may
// open, in the order the shell sorted them. A link is
// `<a href="#/<path>" aria-label="<title>" data-section="<app>:<name>">`; the one of the section
// shown carries `data-status="active"` and `aria-current="page"`. Light DOM, so XPath serves it.
//
// Which sections there are is not the shell's to say, so nothing here names one: a section is
// addressed by its title.
const RAIL = "//nav[@data-component='SectionRail']";
const XPATH = {
  container: RAIL,
  title: `${RAIL}//h1`,
  sectionButtons: `${RAIL}//ul//a[@data-section]`,
  sectionButtonByLabel: (label) => `${RAIL}//ul//a[@aria-label='${label}']`,
};

class MenuSectionsRail extends Page {
  async waitForLoaded(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(XPATH.container, ms);
    } catch (err) {
      await this.handleError('Sections rail was not loaded', 'err_rail', err);
    }
  }

  // The heading of the rail: 'Settings'.
  getRailTitle() {
    return this.getText(XPATH.title);
  }

  // The values of `attribute` of the section links, in display order.
  async getSectionAttributes(attribute) {
    const links = await this.findElements(XPATH.sectionButtons);
    const values = [];
    for (const link of links) {
      values.push({
        name: await link.getAttribute('aria-label'),
        value: await link.getAttribute(attribute),
      });
    }
    return values;
  }

  // The titles of all the sections in the rail, in display order.
  async getSectionNames() {
    return (await this.getSectionAttributes('aria-label')).map(({ name }) => name);
  }

  // The titles of the links carrying data-status='active' - one, the section shown.
  async getActiveSectionNames() {
    const links = await this.getSectionAttributes('data-status');
    return links.filter(({ value }) => value === 'active').map(({ name }) => name);
  }

  // The titles of the links marked aria-current='page' - the active one and no other.
  async getCurrentPageSectionNames() {
    const links = await this.getSectionAttributes('aria-current');
    return links.filter(({ value }) => value === 'page').map(({ name }) => name);
  }

  // The `href` of the section's link as written, e.g. '#/test-provider-users'.
  getSectionHref(label) {
    return this.getAttribute(XPATH.sectionButtonByLabel(label), 'href');
  }

  isSectionButtonDisplayed(label) {
    return this.isElementDisplayed(XPATH.sectionButtonByLabel(label));
  }

  async waitForSectionActive(label, ms = appConst.TIMEOUT.MEDIUM) {
    let active;
    try {
      await this.getBrowser().waitUntil(
        async () => {
          active = await this.getActiveSectionNames();
          return active.length === 1 && active[0] === label;
        },
        { timeout: ms },
      );
    } catch (err) {
      await this.handleError(
        `Sections rail - '${label}' should be the active section, active: [${active}]`,
        'err_rail_active_section',
        err,
      );
    }
  }

  // Clicks on the section's link and waits until that section is the active one.
  async clickOnSectionButton(label) {
    try {
      await this.clickOnElement(XPATH.sectionButtonByLabel(label));
    } catch (err) {
      await this.handleError(`Sections rail - '${label}' link`, 'err_rail_click_section', err);
    }
    await this.waitForSectionActive(label);
  }
}

module.exports = MenuSectionsRail;
