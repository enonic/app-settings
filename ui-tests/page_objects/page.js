const webDriverHelper = require('../libs/WebDriverHelper');
const appConst = require('../libs/app_const');
const path = require('path');
const fs = require('fs');

// What every page object does with the browser: find, read, click, wait - and fail with a
// screenshot.
class Page {
  constructor() {
    if (typeof browser !== 'undefined') {
      this.browser = browser;
    } else {
      this.browser = webDriverHelper.browser;
    }
  }

  getBrowser() {
    return this.browser;
  }

  findElement(selector) {
    return this.browser.$(selector);
  }

  findElements(selector) {
    return this.browser.$$(selector);
  }

  getTitle() {
    return this.browser.getTitle();
  }

  async clickOnElement(selector) {
    let element = await this.findElement(selector);
    await element.waitForDisplayed({ timeout: appConst.TIMEOUT.MEDIUM });
    return await element.click();
  }

  async getText(selector) {
    let element = await this.findElement(selector);
    await element.waitForDisplayed({ timeout: appConst.TIMEOUT.MEDIUM });
    return await element.getText();
  }

  async getAttribute(selector, attributeName) {
    let element = await this.findElement(selector);
    return await element.getAttribute(attributeName);
  }

  async isElementDisplayed(selector) {
    let elements = await this.findElements(selector);
    return elements.length > 0 && (await elements[0].isDisplayed());
  }

  async waitForElementDisplayed(selector, ms = appConst.TIMEOUT.MEDIUM) {
    let element = await this.findElement(selector);
    return await element.waitForDisplayed({ timeout: ms });
  }

  async saveScreenshot(name) {
    try {
      let screenshotsDir = path.join(__dirname, '/../build/reports/screenshots/');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      await this.browser.saveScreenshot(screenshotsDir + name + '.png');
    } catch (err) {
      console.log('screenshot was not saved ' + err);
    }
  }

  // Saves a screenshot under `screenshotName` and throws `errorMessage` with the cause attached.
  async handleError(errorMessage, screenshotName, error) {
    const name = `${screenshotName}_${Date.now()}`;
    await this.saveScreenshot(name);
    throw new Error(`${errorMessage}: ${error?.message ?? 'Unknown error'} [screenshot]: ${name}`, {
      cause: error,
    });
  }
}

module.exports = Page;
