/**
 * The flows the specs share: log in and out, and open the Settings app from the XP menu or at a hash.
 */
const HomePage = require('../page_objects/home.page');
const LoginPage = require('../page_objects/login.page');
const appConst = require('./app_const');
const webDriverHelper = require('./WebDriverHelper');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const fs = require('fs');
const path = require('path');

// 'base.url' from browser.properties, the address the runner opens the browser at.
const propertiesReaderModule = require('properties-reader');
const propertiesReader =
  propertiesReaderModule.propertiesReader ||
  propertiesReaderModule.default ||
  propertiesReaderModule;
const properties = propertiesReader({ sourceFile: path.join(__dirname, '../browser.properties') });
const BASE_URL = String(properties.get('base.url')).replace(/[/]+$/, '') + '/';

module.exports = {
  getBrowser() {
    if (typeof browser !== 'undefined') {
      return browser;
    } else {
      return webDriverHelper.browser;
    }
  },
  async saveScreenshot(name) {
    try {
      let screenshotsDir = path.join(__dirname, '/../build/reports/screenshots/');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      await this.getBrowser().saveScreenshot(screenshotsDir + name + '.png');
      console.log('screenshot is saved ' + name);
    } catch (err) {
      return console.log('screenshot was not saved ' + err);
    }
  },

  // 'base.url' from browser.properties, with a trailing slash, e.g. 'http://localhost:8080/admin/'.
  getBaseUrl() {
    return BASE_URL;
  },
  // The Settings tool's own url, no section named: 'http://localhost:8080/admin/com.enonic.xp.app.settings/main'.
  getSettingsUrl() {
    return `${this.getBaseUrl()}${appConst.SETTINGS_TOOL_PATH}`;
  },

  // Types the credentials when the login page is shown and waits for the XP menu with the Settings
  // link. Already logged in, it only waits. `account` is one of appConst.ACCOUNT.*
  async doLogin(account = appConst.ACCOUNT.SU) {
    let loginPage = new LoginPage();
    if (await loginPage.isLoaded()) {
      await loginPage.doLogin(account.name, account.password);
    }
    await new HomePage().waitForSettingsLinkDisplayed();
  },
  // Logs out through the avatar menu and waits for the login page. The menu is on the XP home
  // page, so that is opened first: a spec may well be inside the Settings app.
  async doLogout() {
    let homePage = new HomePage();
    await this.getBrowser().url(this.getBaseUrl());
    await homePage.clickOnAvatarButton();
    await homePage.clickOnLogoutDropdownMenuItem();
    return await new LoginPage().waitForPageLoaded();
  },
  // Logs in and opens the Settings app by its link in the XP menu; returns once the rail is there.
  async navigateToSettingsApp(account = appConst.ACCOUNT.SU) {
    await this.doLogin(account);
    await new HomePage().clickOnSettingsLink();
    let menuSectionsRail = new MenuSectionsRail();
    await menuSectionsRail.waitForLoaded();
    return menuSectionsRail;
  },
  // Loads the Settings app anew at `hash` ('', '#/', '#/test-provider-roles?foo=bar') and waits for
  // the rail. With the app already open, a url that differs in the hash alone would only route
  // inside it, so the browser is taken off the page first. Where the hash lands is what a test
  // asserts.
  async openSettingsByHash(hash) {
    await this.getBrowser().url('about:blank');
    await this.getBrowser().url(this.getSettingsUrl() + hash);
    let menuSectionsRail = new MenuSectionsRail();
    await menuSectionsRail.waitForLoaded();
    return menuSectionsRail;
  },
  // What the browser has logged since the last call, as [{ level, message, source }]: the console,
  // failed requests and the security messages, a Content-Security-Policy violation among them.
  // Reading empties the log.
  getBrowserLogs() {
    return this.getBrowser().getLogs('browser');
  },
};
