/**
 * A section of the test application 'Test ADFS ID Provider' (enonic/uitest-adfs-provider,
 * assets/_static/main.js): a heading with the section's title and, once the page has read the
 * visitor's roles, a line per role - 'Administrator <kind> Extension' for 'Admin Test Provider App',
 * 'Viewer <kind> Extension' for 'Test Provider App'. Rendered inside the section's shadow root, so
 * every locator is CSS resolved through SectionPage.
 *
 * `section` is an entry of appConst.TEST_PROVIDER.SECTIONS: { title, id, path, ... }.
 */
const SectionPage = require('./section.page');
const appConst = require('../libs/app_const');

const CSS = {
  container: 'div.test-extension',
  title: 'div.test-extension h1.test-extension-title',
  administratorText: 'div.test-extension p#administrator-text',
  viewerText: 'div.test-extension p#viewer-text',
};

class TestExtensionPage extends SectionPage {
  constructor(section) {
    super(section.id);
    this.section = section;
  }

  async waitForLoaded(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(CSS.container, ms);
      await this.waitForElementDisplayed(CSS.title, ms);
    } catch (err) {
      await this.handleError(
        `'${this.section.title}' page was not loaded`,
        'err_test_extension',
        err,
      );
    }
  }

  // The heading of the page: the section's title.
  async getTitle() {
    const title = await this.findElement(CSS.title);
    return (await title.getText()).trim();
  }

  // Waits for the line shown to an administrator of the test application and returns its text. It
  // is added once the page has asked the server for the visitor's roles, hence the wait.
  async waitForAdministratorText(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(CSS.administratorText, ms);
      const line = await this.findElement(CSS.administratorText);
      return (await line.getText()).trim();
    } catch (err) {
      await this.handleError(
        `'${this.section.title}' page - the administrator's text was not shown`,
        'err_test_extension_admin_text',
        err,
      );
    }
  }

  async isViewerTextDisplayed() {
    const lines = await this.findElements(CSS.viewerText);
    return lines.length > 0 && (await lines[0].isDisplayed());
  }

  // The colour the heading is painted in, as the browser computed it - read off the mount by its
  // section id, so it answers for a section kept hidden as well. Undefined while not mounted.
  getTitleColor() {
    return this.getBrowser().execute((id) => {
      const mount = document.querySelector(`[data-component='SectionMount'][data-section='${id}']`);
      const title = mount?.shadowRoot?.querySelector('h1.test-extension-title');
      return title ? getComputedStyle(title).color : undefined;
    }, this.section.id);
  }

  async waitForTitleColor(expected, ms = appConst.TIMEOUT.MEDIUM) {
    let actual;
    await this.getBrowser().waitUntil(
      async () => {
        actual = await this.getTitleColor();
        return actual === expected;
      },
      {
        timeout: ms,
        timeoutMsg: `'${this.section.title}' - the heading should be painted in ${expected}`,
      },
    );
  }

  async waitForTitleColorNot(unexpected, ms = appConst.TIMEOUT.MEDIUM) {
    await this.getBrowser().waitUntil(
      async () => {
        const actual = await this.getTitleColor();
        return actual !== undefined && actual !== unexpected;
      },
      {
        timeout: ms,
        timeoutMsg: `'${this.section.title}' - the heading should not stay painted in ${unexpected}`,
      },
    );
  }
}

module.exports = TestExtensionPage;
