/**
 * The flows the specs share: log in and out, open the Settings app and a section of it, and make test
 * data through the sections' GraphQL API.
 */
const HomePage = require('../page_objects/home.page');
const LoginPage = require('../page_objects/login.page');
const appConst = require('./app_const');
const webDriverHelper = require('./WebDriverHelper');
const MenuSectionsRail = require('../page_objects/menu.sections.rail');
const userItemsBuilder = require('./users.items.builder');
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
  async waitForElementDisplayed(selector, ms) {
    let element = await this.getBrowser().$(selector);
    return await element.waitForDisplayed({ timeout: ms });
  },

  getTitle() {
    return this.getBrowser().getTitle();
  },
  async saveScreenshotUniqueName(namePart) {
    let screenshotName = appConst.generateRandomName(namePart);
    await this.saveScreenshot(screenshotName);
    return screenshotName;
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
  async navigateToHomePage() {
    await this.getBrowser().url(this.getBaseUrl());
  },

  // Types the credentials when the login page is shown and waits for the XP menu with the Settings
  // link. Already logged in, it only waits.
  async doLogin(userName, password) {
    let loginPage = new LoginPage();
    let result = await loginPage.isLoaded();
    if (result) {
      await loginPage.doLogin(userName, password);
    }
    let homePage = new HomePage();
    await homePage.waitForSettingsLinkDisplayed();
  },
  // Logs out through the avatar menu and waits for the login page. The menu is on the XP home
  // page, so that is opened first: a spec may well be inside the Settings app.
  async doLogout() {
    let loginPage = new LoginPage();
    let homePage = new HomePage();
    await this.navigateToHomePage();
    await homePage.clickOnAvatarButton();
    await homePage.clickOnLogoutDropdownMenuItem();
    return await loginPage.waitForPageLoaded();
  },
  // Logs in, opens the Settings app and, when a section is given, switches to it via the rail.
  // `section` is one of appConst.EXTENSIONS.*; `options` are navigateToExtension()'s.
  async navigateToSettingsApp(userName, password, section, options) {
    try {
      await this.doLogin(userName, password);
      let homePage = new HomePage();
      await homePage.clickOnSettingsLink();
      let menuSectionsRail = new MenuSectionsRail();
      await menuSectionsRail.waitForLoaded();
      if (section) {
        await this.navigateToExtension(section, options);
      }
    } catch (err) {
      let screenshot = await this.saveScreenshotUniqueName('err_navigate_settings');
      throw new Error(
        `Error occurred after clicking on Settings link ,  screenshot:${screenshot}  ` + err,
      );
    }
  },
  // Opens a section (extension) of the Settings app through the sections rail and waits until its
  // browse screen is shown: the rail link is active, the app bar shows the section title and the
  // 'Actions' toolbar is displayed - or, with `{ readOnly: true }`, the read-only banner a visitor
  // without write access gets in its place.
  async navigateToExtension(section, { readOnly = false } = {}) {
    try {
      let menuSectionsRail = new MenuSectionsRail();
      await menuSectionsRail.waitForLoaded();
      await menuSectionsRail.clickOnSectionButton(section);
      await this.waitForSectionScreenLoaded(section, { readOnly });
      return menuSectionsRail;
    } catch (err) {
      let screenshot = await this.saveScreenshotUniqueName('err_navigate_extension');
      throw new Error(`'${section}' section was not opened, screenshot: ${screenshot} ` + err);
    }
  },

  // The direct link to a section, e.g. 'http://localhost:8080/admin/com.enonic.xp.app.settings/main#/roles'.
  getSectionUrl(section) {
    const path = appConst.SECTION_PATH[this.getSectionName(section)];
    return `${this.getBaseUrl()}${appConst.SETTINGS_TOOL_PATH}#/${path}`;
  },
  // Loads the Settings app at a section's direct link. The page is loaded anew: with the app
  // already open, a url that differs in the hash alone would only route inside it, so the browser
  // is taken off the page first. Only the rail is waited for - where the link lands is what a test
  // asserts.
  async openSectionByUrl(section) {
    await this.getBrowser().url('about:blank');
    await this.getBrowser().url(this.getSectionUrl(section));
    let menuSectionsRail = new MenuSectionsRail();
    await menuSectionsRail.waitForLoaded();
    return menuSectionsRail;
  },

  // The Settings tool's own url, no section named: 'http://localhost:8080/admin/com.enonic.xp.app.settings/main'.
  getSettingsUrl() {
    return `${this.getBaseUrl()}${appConst.SETTINGS_TOOL_PATH}`;
  },
  // Loads the Settings app anew at `hash` ('#/', '#/no-such-section', '#/roles/role%253Asystem.admin')
  // and waits for the rail.
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

  // Section-agnostic 'loaded' check for the browse screen, independent of a section's page object.
  //
  // The app bar is light DOM, so XPath serves it. The toolbar is inside the section's shadow root,
  // where Chrome cannot evaluate XPath ("#document-fragment is not a valid context node type"), so it
  // is located with CSS through webdriverio's deep selector from the section's shadow host - the
  // same way SectionPage scopes every lookup (see page_objects/section.page.js).
  async waitForSectionScreenLoaded(
    section,
    { readOnly = false, ms = appConst.TIMEOUT.MEDIUM } = {},
  ) {
    const appBarTitle = `//header//h2[text()='${section}']`;
    await this.waitForElementDisplayed(appBarTitle, ms);

    // Light DOM: the shadow host of the section's mount, the SectionMount element itself. Inactive
    // sections stay mounted too, hence the scoping by section id and by the status only the visible
    // one carries.
    const shadowHost = `div[data-component='SectionMount'][data-section='${this.getSectionId(section)}'][data-status='active']`;
    // 'BrowseToolbar' where a section carries its own data-component (app-users),
    // 'Toolbar.Container' where it does not (app-applications). One selector each: a deep selector
    // must not be a comma-separated list, webdriverio splits it on the commas when it re-matches
    // the element.
    const landmarks = readOnly
      ? [">>> [data-component='ManagedModeBanner']"]
      : [
          ">>> [data-component='BrowseToolbar'][aria-label='Actions']",
          ">>> [data-component='Toolbar.Container'][aria-label='Actions']",
        ];
    const what = readOnly ? 'read-only banner' : "'Actions' toolbar";
    await this.getBrowser().waitUntil(
      async () => {
        const host = await this.getBrowser().$(shadowHost);
        if (!(await host.isExisting())) {
          return false;
        }
        for (const landmark of landmarks) {
          if (await host.$(landmark).isDisplayed()) {
            return true;
          }
        }
        return false;
      },
      {
        timeout: ms,
        timeoutMsg: `'${section}' section - the ${what} is still not displayed in: ${ms}`,
      },
    );
  },
  // The 'data-section' of a section's mount (appConst.SECTION_ID.*) from its title
  // (appConst.EXTENSIONS.*, what the rail and the app bar show).
  getSectionId(section) {
    return appConst.SECTION_ID[this.getSectionName(section)];
  },
  // The name a section goes by in appConst ('ID_PROVIDERS') from its title ('ID Providers').
  getSectionName(section) {
    const key = Object.keys(appConst.EXTENSIONS).find(
      (name) => appConst.EXTENSIONS[name] === section,
    );
    if (key === undefined) {
      throw new Error(`Unknown section '${section}': not one of appConst.EXTENSIONS`);
    }
    return key;
  },

  // GraphQL API - the sections' own endpoint (app-users), called from the page the browser is on
  // with its session cookie. The browser must be logged in (doLogin) and stay on the XP admin origin.

  // Posts a GraphQL request from the current page and returns { status, text } without interpreting it.
  // An async function under execute(): webdriverio awaits its promise (executeAsync is gone in v10).
  async postGraphQl(url, query, variables) {
    return await this.getBrowser().execute(
      async function (url, query, variables) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ query: query, variables: variables }),
          });
          return { status: response.status, text: await response.text() };
        } catch (err) {
          return { status: 0, text: String(err) };
        }
      },
      url,
      query,
      variables,
    );
  },

  // Sends a GraphQL request to the app's API and returns its 'data'. Throws on HTTP or GraphQL errors.
  async sendGraphQlRequest(query, variables, url = appConst.GRAPHQL_API.USERS) {
    const result = await this.postGraphQl(url, query, variables);
    let body;
    try {
      body = JSON.parse(result.text);
    } catch {
      throw new Error(`GraphQL: unexpected response (${result.status}): ${result.text}`);
    }
    if (result.status !== 200 || body.errors || body.error) {
      throw new Error(`GraphQL request failed (${result.status}): ${result.text}`);
    }
    return body.data;
  },

  // Waits until a role with the given display name exists. A test application is copied into
  // home/deploy while the server is starting and creates its roles when it starts, which may be a
  // moment after the server reports itself ready.
  async waitForRoleExists(displayName, ms = 30000) {
    const deadline = Date.now() + ms;
    for (;;) {
      const data = await this.sendGraphQlRequest('{ roles { displayName } }', {});
      if (data.roles.some((role) => role.displayName === displayName)) {
        return;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `The role '${displayName}' does not exist after ${ms} ms - is its application deployed?`,
        );
      }
      await this.getBrowser().pause(1000);
    }
  },

  // The keys of roles from their display names ('Users App') - a principal key ('role:...') is
  // taken as is. Read once for the whole list.
  async resolveRoleKeys(roles) {
    const names = roles.filter((role) => !role.startsWith('role:'));
    if (names.length === 0) {
      return [...roles];
    }
    const data = await this.sendGraphQlRequest('{ roles { key displayName } }', {});
    return roles.map((role) => {
      if (role.startsWith('role:')) {
        return role;
      }
      const found = data.roles.find((item) => item.displayName === role);
      if (found === undefined) {
        throw new Error(
          `Unknown role '${role}': use a display name from appConst.SYSTEM_ROLES or a key 'role:...'. ` +
            'Existing: ' +
            data.roles.map((item) => `${item.displayName} (${item.key})`).join(', '),
        );
      }
      return found.key;
    });
  },

  // Creates a service account - a user of the system ID provider - through the GraphQL API.
  // `serviceAccount` is what users.items.builder.buildServiceAccount() returns: { displayName, id,
  // email?, password?, roles?, groups? }. `roles` are display names or 'role:' keys; `groups` are
  // group keys ('group:system:editors'). An empty or missing `password` leaves the account without
  // one. Returns the service account with its 'key'.
  createServiceAccountViaApi(serviceAccount) {
    return this.createUserViaApi(
      Object.assign({}, serviceAccount, { idProvider: userItemsBuilder.SYSTEM_ID_PROVIDER }),
    );
  },

  // Creates a user through the GraphQL API. `user` is what users.items.builder.buildUser() returns:
  // { idProvider, displayName, id, email?, password?, roles?, groups? }. `idProvider` is the key of
  // the provider the user lives in ('system' makes it a service account); `roles` are display names
  // or 'role:' keys; `groups` are group keys. Returns the user with its 'key'.
  async createUserViaApi(user) {
    if (!user.idProvider) {
      throw new Error(`createUserViaApi: '${user.displayName}' names no ID provider`);
    }
    const query = `mutation ($idProvider: String!, $name: String!, $displayName: String!, $email: String, $password: String, $roles: [String!], $groups: [String!]) {
      createUser(idProvider: $idProvider, name: $name, displayName: $displayName, email: $email, password: $password, roles: $roles, groups: $groups) {
        key displayName
      }
    }`;
    const data = await this.sendGraphQlRequest(query, {
      idProvider: user.idProvider,
      name: user.id ?? user.name ?? user.displayName,
      displayName: user.displayName,
      email: user.email,
      password: user.password || undefined,
      roles: await this.resolveRoleKeys(user.roles ?? []),
      groups: user.groups ?? [],
    });
    console.log('User created via API: ' + data.createUser.key);
    return Object.assign({}, user, { key: data.createUser.key });
  },

  // Creates a group through the GraphQL API. `group` is what users.items.builder.buildGroup()
  // returns: { idProvider, displayName, id, description?, members?, roles? }. `idProvider` is the
  // provider's key; `members` are principal keys; `roles` are display names or 'role:' keys.
  // Returns the group with its 'key'.
  async createGroupViaApi(group) {
    const query = `mutation ($idProvider: String!, $name: String!, $displayName: String!, $description: String, $members: [String!], $roles: [String!]) {
      createGroup(idProvider: $idProvider, name: $name, displayName: $displayName, description: $description, members: $members, roles: $roles) {
        key displayName
      }
    }`;
    const data = await this.sendGraphQlRequest(query, {
      idProvider: group.idProvider,
      name: group.id ?? group.name ?? group.displayName,
      displayName: group.displayName,
      description: group.description,
      members: group.members ?? [],
      roles: await this.resolveRoleKeys(group.roles ?? []),
    });
    console.log('Group created via API: ' + data.createGroup.key);
    return Object.assign({}, group, { key: data.createGroup.key });
  },

  // Creates a role through the GraphQL API. `role` is what users.items.builder.buildRole() returns:
  // { displayName, id, description?, users?, groups? } - the members as principal keys. Returns the
  // role with its 'key'.
  async createRoleViaApi(role) {
    const query = `mutation ($name: String!, $displayName: String!, $description: String, $members: [String!]) {
      createRole(name: $name, displayName: $displayName, description: $description, members: $members) {
        key displayName
      }
    }`;
    const data = await this.sendGraphQlRequest(query, {
      name: role.id ?? role.name ?? role.displayName,
      displayName: role.displayName,
      description: role.description,
      members: [...(role.users ?? []), ...(role.groups ?? [])],
    });
    console.log('Role created via API: ' + data.createRole.key);
    return Object.assign({}, role, { key: data.createRole.key });
  },

  // Creates an ID provider through the GraphQL API, with the permissions a new provider starts
  // from in the editor and no application. `idProvider` is what
  // users.items.builder.buildIdProvider() returns: { displayName, id, description? }. Returns the
  // provider with its 'key' once the list of providers holds it.
  async createIdProviderViaApi(idProvider) {
    const defaults = await this.sendGraphQlRequest(
      '{ defaultIdProviderPermissions { principal { key } access } }',
      {},
    );
    const permissions = defaults.defaultIdProviderPermissions.map(({ principal, access }) => ({
      principal: principal.key,
      access,
    }));
    const query = `mutation ($name: String!, $displayName: String!, $description: String, $permissions: [IdProviderPermissionInput!]) {
      createIdProvider(name: $name, displayName: $displayName, description: $description, permissions: $permissions) {
        key displayName
      }
    }`;
    const data = await this.sendGraphQlRequest(query, {
      name: idProvider.id ?? idProvider.name ?? idProvider.displayName,
      displayName: idProvider.displayName,
      description: idProvider.description,
      permissions,
    });
    console.log('ID provider created via API: ' + data.createIdProvider.key);
    await this.waitForIdProviderListed(data.createIdProvider.key);
    return Object.assign({}, idProvider, { key: data.createIdProvider.key });
  },

  // Waits until the list of ID providers (the search index) holds the key. A create leaves the index
  // stale for a moment, and a user or group made in the provider right after it is refused until
  // the index has caught up.
  async waitForIdProviderListed(key, ms = appConst.TIMEOUT.LONG) {
    const deadline = Date.now() + ms;
    for (;;) {
      const data = await this.sendGraphQlRequest('{ idProviders { key } }', {});
      if (data.idProviders.some((provider) => provider.key === key)) {
        return;
      }
      if (Date.now() >= deadline) {
        throw new Error(`The ID provider '${key}' is still not listed after ${ms} ms`);
      }
      await this.getBrowser().pause(300);
    }
  },

  // Deletes ID providers through the GraphQL API. `keys` is a key, a list of keys, or what
  // createIdProviderViaApi() returned. Throws when any was not deleted - a provider that still
  // holds users or groups is refused.
  async deleteIdProvidersViaApi(keys) {
    const list = [].concat(keys).map((item) => (typeof item === 'string' ? item : item.key));
    const query = `mutation ($keys: [String!]!) {
      deleteIdProviders(keys: $keys) { key deleted reason }
    }`;
    const data = await this.sendGraphQlRequest(query, { keys: list });
    const failed = data.deleteIdProviders.filter((item) => !item.deleted);
    if (failed.length > 0) {
      throw new Error('ID providers were not deleted: ' + JSON.stringify(failed));
    }
    console.log('ID providers deleted via API: ' + list.join(', '));
    return data.deleteIdProviders;
  },

  // Deletes principals (users, groups, roles) through the GraphQL API. `keys` is a principal key, a
  // list of them, or what a create*ViaApi() returned (its 'key' is taken). Throws when any was not
  // deleted.
  async deletePrincipalsViaApi(keys) {
    const list = [].concat(keys).map((item) => (typeof item === 'string' ? item : item.key));
    const query = `mutation ($keys: [String!]!) {
      deletePrincipals(keys: $keys) { key deleted reason }
    }`;
    const data = await this.sendGraphQlRequest(query, { keys: list });
    const failed = data.deletePrincipals.filter((item) => !item.deleted);
    if (failed.length > 0) {
      throw new Error('Principals were not deleted: ' + JSON.stringify(failed));
    }
    console.log('Principals deleted via API: ' + list.join(', '));
    return data.deletePrincipals;
  },
};
