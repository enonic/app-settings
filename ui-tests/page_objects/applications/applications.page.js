/**
 * The Applications section (app-applications): a browse screen with a toolbar of four actions -
 * Install, which needs no selection, and Uninstall, Start and Stop, which act on the selected
 * applications. What the screen does beyond its toolbar is tested in app-applications/ui-tests;
 * this class names the buttons the shell's specs read.
 */
const BrowsePage = require('../browse.page');
const appConst = require('../../libs/app_const');

const BUTTON = Object.freeze({
  INSTALL: 'Install',
  UNINSTALL: 'Uninstall',
  START: 'Start',
  STOP: 'Stop',
});

class ApplicationsPage extends BrowsePage {
  constructor() {
    super({
      sectionId: appConst.SECTION_ID.APPLICATIONS,
      pageComponent: 'ApplicationsPage',
      pageName: 'Applications page',
    });
    // Located by the buttons themselves: the toolbar element is named differently from one
    // provider to another ('BrowseToolbar', 'Toolbar.Container'), a 'Toolbar.Item' is not.
    this.css.toolbarButtons = `${this.css.container} button[data-component='Toolbar.Item']`;
    this.css.toolbarButton = (label) =>
      `${this.css.container} button[data-component='Toolbar.Item'][aria-label='${label}']`;
  }

  static get BUTTON() {
    return BUTTON;
  }

  async waitForLoaded(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(this.css.container, ms);
      await this.waitForElementDisplayed(this.css.toolbarButton(BUTTON.INSTALL), ms);
    } catch (err) {
      await this.handleError(`${this.pageName} was not loaded`, 'err_applications_page', err);
    }
  }

  // `label` is one of ApplicationsPage.BUTTON.*
  async isToolbarButtonEnabled(label) {
    const button = await this.findElement(this.css.toolbarButton(label));
    return await button.isEnabled();
  }

  waitForToolbarButtonEnabled(label, ms = appConst.TIMEOUT.MEDIUM) {
    return this.waitForButtonEnabled(this.css.toolbarButton(label), label, 'err_app_button', ms);
  }

  waitForToolbarButtonDisabled(label, ms = appConst.TIMEOUT.MEDIUM) {
    return this.waitForButtonDisabled(this.css.toolbarButton(label), label, 'err_app_button', ms);
  }
}

module.exports = ApplicationsPage;
