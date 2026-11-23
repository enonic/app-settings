const Page = require('./page');
const appConst = require('../libs/app_const');

// A section is rendered inside its own shadow root, attached to the SectionMount element itself
// (docs/extensions/host-facts.md): the mount carries data-section and, on the visible one,
// data-status='active'. Chrome cannot evaluate XPath below a shadow root, so every lookup here is
// CSS, scoped to the active section's host through webdriverio's deep selector. Inactive sections
// stay mounted, without the status.
const DEEP = '>>> ';

class SectionPage extends Page {
  constructor(sectionId) {
    super();
    this.sectionId = sectionId;
  }

  get shadowHostLocator() {
    return `div[data-component='SectionMount'][data-section='${this.sectionId}'][data-status='active']`;
  }

  async getShadowHost(ms = appConst.TIMEOUT.MEDIUM) {
    const host = await this.browser.$(this.shadowHostLocator);
    await host.waitForExist({ timeout: ms });
    return host;
  }

  async findElement(cssSelector) {
    const host = await this.getShadowHost();
    return await host.$(DEEP + cssSelector);
  }

  async findElements(cssSelector) {
    const host = await this.getShadowHost();
    return await host.$$(DEEP + cssSelector);
  }
}

module.exports = SectionPage;
