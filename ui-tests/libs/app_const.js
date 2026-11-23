module.exports = Object.freeze({
  SUITE_TIMEOUT: 180000,
  TIMEOUT: {
    MEDIUM: 3000,
    LONG: 5000,
    SHORT: 2000,
  },
  // The accounts the specs log in as. SU is the instance's own (test-config/system.properties); it
  // passes the access rules of every section. The other two are made by the test application when
  // it starts (uitest-adfs-provider, main.js), fixed, so a spec neither creates nor deletes them.
  ACCOUNT: {
    SU: { name: 'su', password: 'password' },
    // 'Administration Console Login' alone: no section's access rules include it.
    NO_SECTIONS: { name: 'test-provider-no-sections', password: 'Test-Provider-No-Sections-1' },
    // 'Administration Console Login' and the test application's viewer role, 'Test Provider App'.
    VIEWER: { name: 'test-provider-viewer', password: 'Test-Provider-Viewer-1' },
  },
  // The Settings admin tool, relative to 'base.url'.
  SETTINGS_TOOL_PATH: 'com.enonic.xp.app.settings/main',
  // The heading of the rail (phrase: app.displayName).
  RAIL_TITLE: 'Settings',
  // The browser tab over a section (phrase: app.tabTitle, then the section's title).
  documentTitle: (section) => `XP Settings / ${section}`,
  // What the shell shows with no section to mount (phrases: sections.empty, sections.empty.hint).
  SECTIONS_EMPTY: {
    MESSAGE: 'No administration applications',
    HINT: 'Install one, or check that its access rules include you',
  },
  // The sections of the test application 'Test ADFS ID Provider' (com.enonic.uitest:adfs-idprovider),
  // the only sections the suite knows by name, in the order the rail lists them (`config.order`):
  // each with its title, the 'data-section' of its mount, its url segment and the line its page
  // shows to a visitor holding the viewer role. The first is open to the test application's admin
  // role alone, the other two to its viewer role as well.
  TEST_SECTIONS: [
    {
      title: 'Test User Extension',
      id: 'com.enonic.uitest.adfs_idprovider:test-users',
      path: 'test-provider-users',
      viewerText: 'Viewer User Extension',
      openToViewer: false,
    },
    {
      title: 'Test Group Extension',
      id: 'com.enonic.uitest.adfs_idprovider:test-groups',
      path: 'test-provider-groups',
      viewerText: 'Viewer Group Extension',
      openToViewer: true,
    },
    {
      title: 'Test Role Extension',
      id: 'com.enonic.uitest.adfs_idprovider:test-roles',
      path: 'test-provider-roles',
      viewerText: 'Viewer Role Extension',
      openToViewer: true,
    },
  ],
});
