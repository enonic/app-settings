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
  // The sections of the test application 'Test ADFS ID Provider' (com.enonic.uitest:adfs-idprovider),
  // in the order the rail lists them: each with its title, the 'data-section' of its mount, its url
  // segment and the line its page shows to a visitor holding the 'Admin Test Provider App' role
  // ('Viewer ...' to one holding 'Test Provider App').
  TEST_PROVIDER: {
    ROLE: {
      ADMIN: 'Admin Test Provider App',
      APP: 'Test Provider App',
    },
    SECTIONS: [
      {
        title: 'Test User Extension',
        id: 'com.enonic.uitest.adfs_idprovider:test-users',
        path: 'test-provider-users',
        administratorText: 'Administrator User Extension',
        viewerText: 'Viewer User Extension',
      },
      {
        title: 'Test Group Extension',
        id: 'com.enonic.uitest.adfs_idprovider:test-groups',
        path: 'test-provider-groups',
        administratorText: 'Administrator Group Extension',
        viewerText: 'Viewer Group Extension',
      },
      {
        title: 'Test Role Extension',
        id: 'com.enonic.uitest.adfs_idprovider:test-roles',
        path: 'test-provider-roles',
        administratorText: 'Administrator Role Extension',
        viewerText: 'Viewer Role Extension',
      },
    ],
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
  // The browser tab over a section (phrase: app.tabTitle, then the section's title).
  documentTitle: (section) => `XP Settings / ${section}`,
  // The Settings admin tool, relative to 'base.url'.
  SETTINGS_TOOL_PATH: 'com.enonic.xp.app.settings/main',
  // What the shell shows with no section to mount (phrases: sections.empty, sections.empty.hint).
  SECTIONS_EMPTY: {
    MESSAGE: 'No administration applications',
    HINT: 'Install one, or check that its access rules include you',
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
