const Page = require('./page');
const appConst = require('../libs/app_const');

// What the shell shows in the content area when there is no section to mount (SectionsEmpty): the
// message - 'No administration applications', or that they could not be listed - and, under it, a
// hint for a visitor who is not an administrator. Light DOM, the shell's own, so XPath serves it.
const XPATH = {
  container: "//div[@data-component='SectionsEmpty']",
  message: "//div[@data-component='SectionsEmpty']/p[1]",
  hint: "//div[@data-component='SectionsEmpty']/p[2]",
  sectionMounts: "//div[@data-component='SectionMount']",
  appBarTitle: "//header[@data-component='AppBar']//h2",
};

class SectionsEmpty extends Page {
  async waitForLoaded(ms = appConst.TIMEOUT.MEDIUM) {
    try {
      await this.waitForElementDisplayed(XPATH.container, ms);
    } catch (err) {
      await this.handleError(
        "The 'No administration applications' state was not shown",
        'err_sections_empty',
        err,
      );
    }
  }

  // 'No administration applications'
  getMessage() {
    return this.getText(XPATH.message);
  }

  // 'Install one, or check that its access rules include you'
  getHint() {
    return this.getText(XPATH.hint);
  }

  // 'status' while discovery answered with no section, 'alert' when it could not be asked.
  getRole() {
    return this.getAttribute(XPATH.container, 'role');
  }

  // The sections mounted, whether shown or kept hidden - none in this state.
  async getSectionMountsCount() {
    const mounts = await this.findElements(XPATH.sectionMounts);
    return mounts.length;
  }

  // The title in the app bar: the active section's, so empty here.
  async getAppBarTitle() {
    const title = await this.findElement(XPATH.appBarTitle);
    return (await title.getText()).trim();
  }
}

module.exports = SectionsEmpty;
