/**
 * A section of the test application 'Test ADFS ID Provider' (enonic/uitest-adfs-provider,
 * assets/_static/main.js): a heading with the section's title and, once the page has asked its own
 * endpoint for the visitor's roles, a line per test role the visitor holds - 'Viewer <kind>
 * Extension' for 'Test Provider App'. Rendered inside the section's shadow root, so every locator
 * is CSS resolved through SectionPage.
 *
 * `section` is an entry of appConst.TEST_SECTIONS: { title, id, path, viewerText, ... }.
 */
const SectionPage = require('./section.page');
const appConst = require('../libs/app_const');

const CSS = {
  container: 'div.test-extension',
  title: 'div.test-extension h1.test-extension-title',
  viewerText: 'div.test-extension p#viewer-text',
};

class TestExtensionPage extends SectionPage {
  constructor(section) {
    super(section.id);
    this.section = section;
  }

  // The mount is the active one and the page's module has rendered into it.
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

  // Waits for the line shown to a visitor with the viewer role and returns its text. The page adds
  // it once the section's own endpoint has answered, so it also shows that the section was handed
  // its own base url.
  async waitForViewerText(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(CSS.viewerText, ms);
      const line = await this.findElement(CSS.viewerText);
      return (await line.getText()).trim();
    } catch (err) {
      await this.handleError(
        `'${this.section.title}' page - the viewer's text was not shown`,
        'err_test_extension_viewer_text',
        err,
      );
    }
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

  // `matches` is told the colour and says whether it is the one waited for; `expectation` words it
  // for the failure, which also names the colour last read.
  async waitForTitleColorThat(matches, expectation, ms = appConst.TIMEOUT.MEDIUM) {
    let actual;
    try {
      await this.getBrowser().waitUntil(
        async () => {
          actual = await this.getTitleColor();
          return actual !== undefined && matches(actual);
        },
        { timeout: ms },
      );
    } catch (err) {
      throw new Error(
        `'${this.section.title}' - the heading should ${expectation}, it is painted in ${actual}`,
        { cause: err },
      );
    }
    return actual;
  }

  waitForTitleColor(expected, ms) {
    return this.waitForTitleColorThat(
      (color) => color === expected,
      `be painted in ${expected}`,
      ms,
    );
  }

  waitForTitleColorNot(unexpected, ms) {
    return this.waitForTitleColorThat(
      (color) => color !== unexpected,
      `not stay painted in ${unexpected}`,
      ms,
    );
  }
}

module.exports = TestExtensionPage;
