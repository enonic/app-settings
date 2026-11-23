const Page = require('./page');

// XP's login page.
const CSS = {
  usernameInput: `input[id^='username-input']`,
  passwordInput: `input[id^='password-input']`,
  loginButton: `button[id^='login-button']`,
};

class LoginPage extends Page {
  waitForPageLoaded() {
    return this.waitForElementDisplayed(CSS.usernameInput);
  }

  isLoaded() {
    return this.isElementDisplayed(CSS.usernameInput);
  }

  async doLogin(userName, password) {
    let usernameInput = await this.findElement(CSS.usernameInput);
    let passwordInput = await this.findElement(CSS.passwordInput);
    await usernameInput.waitForDisplayed({ timeout: 1000 });
    await usernameInput.addValue(userName);
    await passwordInput.addValue(password);
    return await this.clickOnElement(CSS.loginButton);
  }
}

module.exports = LoginPage;
