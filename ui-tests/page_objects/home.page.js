const Page = require('./page');
const appConst = require('../libs/app_const');

// XP's home page: the XP menu with a tile per admin tool and the avatar menu with Log out. The menu
// is a custom element with a shadow root of its own, so its parts are found through `shadow$`.
const CSS = {
  xpMenu: 'xp-menu',
  settingsLink: 'a[data-tool-id="com.enonic.xp.app.settings:main"] span.app-tile-name',
  avatarButton: 'button#avatar-button',
  logoutMenuItem: 'a.avatar-dropdown-item',
};

class HomePage extends Page {
  async findInXpMenu(selector) {
    const host = await this.findElement(CSS.xpMenu);
    await host.waitForExist({ timeout: appConst.TIMEOUT.MEDIUM });
    const element = await host.shadow$(selector);
    await element.waitForDisplayed({ timeout: appConst.TIMEOUT.MEDIUM });
    return element;
  }

  async waitForSettingsLinkDisplayed() {
    try {
      await this.findInXpMenu(CSS.settingsLink);
    } catch (err) {
      await this.handleError('XP menu - Settings link was not shown', 'err_settings_link', err);
    }
  }

  async clickOnSettingsLink() {
    try {
      const link = await this.findInXpMenu(CSS.settingsLink);
      await link.click();
    } catch (err) {
      await this.handleError('XP menu - Settings link', 'err_settings_link', err);
    }
  }

  async clickOnAvatarButton() {
    try {
      const button = await this.findInXpMenu(CSS.avatarButton);
      await button.click();
    } catch (err) {
      await this.handleError('XP menu - avatar button', 'err_avatar_button', err);
    }
  }

  async clickOnLogoutDropdownMenuItem() {
    try {
      const item = await this.findInXpMenu(CSS.logoutMenuItem);
      await item.click();
    } catch (err) {
      await this.handleError('XP menu - Log out item', 'err_logout_menu_item', err);
    }
  }
}

module.exports = HomePage;
