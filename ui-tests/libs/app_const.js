module.exports = Object.freeze({
  SUITE_TIMEOUT: 180000,
  generateRandomName(part) {
    return part + Math.round(Math.random() * 1000000);
  },

  BROWSER_XP_TITLES: {
    XP_HOME: 'Enonic XP Home',
  },
  TIMEOUT: {
    MEDIUM: 3000,
    LONG: 5000,
    SHORT: 2000,
  },

  PASSWORD: {
    MEDIUM: 'AUserA567$',
    STRONG: '1User%#567$=',
    WEAK: 'test12345',
  },

  systemUsersDisplayName: {
    ANONYMOUS_USER: 'Anonymous User',
    SUPER_USER: 'Super User',
  },

  // Display names of the roles XP ships with.
  SYSTEM_ROLES: {
    ADMIN_CONSOLE: 'Administration Console Login',
    ADMINISTRATOR: 'Administrator',
    CM_ADMIN: 'Content Manager Administrator',
    USERS_APP: 'Users App',
    USERS_ADMINISTRATOR: 'Users Administrator',
    AUTHENTICATED: 'Authenticated',
    EVERYONE: 'Everyone',
  },
  // The sections as the rail and the app bar title them.
  EXTENSIONS: {
    APPLICATIONS: 'Applications',
    SERVICE_ACCOUNTS: 'Service Accounts',
    USERS: 'Users',
    GROUPS: 'Groups',
    ROLES: 'Roles',
    ID_PROVIDERS: 'ID Providers',
  },
  // 'data-section' of the SectionMount that hosts the extension's shadow root
  SECTION_ID: {
    APPLICATIONS: 'com.enonic.xp.app.applications:applications',
    SERVICE_ACCOUNTS: 'com.enonic.xp.app.users:service-accounts',
    USERS: 'com.enonic.xp.app.users:users',
    GROUPS: 'com.enonic.xp.app.users:groups',
    ROLES: 'com.enonic.xp.app.users:roles',
    ID_PROVIDERS: 'com.enonic.xp.app.users:id-providers',
  },
  // The url segment a section answers to (`config.path` of its extension descriptor): the section
  // is at '<tool url>#/<path>'.
  SECTION_PATH: {
    APPLICATIONS: 'applications',
    SERVICE_ACCOUNTS: 'service-accounts',
    USERS: 'users',
    GROUPS: 'groups',
    ROLES: 'roles',
    ID_PROVIDERS: 'id-providers',
  },
  // 'data-component' of a section's browse screen, the root of what BrowsePage locates.
  PAGE_COMPONENT: {
    SERVICE_ACCOUNTS: 'ServiceAccountsPage',
    USERS: 'UsersPage',
    GROUPS: 'GroupsPage',
    ROLES: 'RolesPage',
    ID_PROVIDERS: 'IdProvidersPage',
  },
  // The browser tab over a section (phrase: app.tabTitle, then the section's title).
  documentTitle: (section) => `XP Settings / ${section}`,
  // The Settings admin tool, relative to 'base.url'.
  SETTINGS_TOOL_PATH: 'com.enonic.xp.app.settings/main',
  // What the shell shows with no section to mount (phrases: sections.empty, sections.empty.hint).
  SECTIONS_EMPTY: {
    MESSAGE: 'No administration applications',
    HINT: 'Install one, or check that its access rules include you',
  },
  // The shell's own toasts about the events connection (phrases: connection.*).
  CONNECTION: {
    LOST: 'Lost connection to the server. Changes will show once it is back',
    SESSION_ENDED: 'Your session has ended. Reload the page to sign in again',
    RELOAD: 'Reload',
  },
  // The banner a section shows in place of its toolbar to a visitor who may read but not write
  // (app-users phrases: readOnly.*).
  READ_ONLY: {
    TITLE: 'Read-only mode',
    HELP: 'Contact your administrator to make changes',
  },
  // What the details panel shows in place of an item (phrases: browse.details.*): nothing selected.
  DETAILS_MESSAGE: {
    SELECT_AN_ITEM: 'Select an item to see its details',
  },
  // The GraphQL endpoint of a section, relative to the admin origin. One schema serves every section
  // of app-users, so any of them takes any query; the gate differs per section.
  GRAPHQL_API: {
    USERS:
      '/admin/com.enonic.xp.app.settings/main/_/admin:extension/com.enonic.xp.app.users:users/graphql',
    ID_PROVIDERS:
      '/admin/com.enonic.xp.app.settings/main/_/admin:extension/com.enonic.xp.app.users:id-providers/graphql',
  },
});
