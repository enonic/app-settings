/**
 * The admin events hub topics this app registers and publishes (`lib/events/`). A provider carries
 * the names of the topics it subscribes, copied from the table in `docs/extensions/docs.md`
 * § Events — the topics are the host's, not part of the mount contract. Each topic's `allow` is
 * server-side; payloads carry ids, never data — the one exception being the download url
 * `applicationProgress` is keyed by, which is the only handle core reports.
 */
export const HUB_TOPICS = {
  /** Application lifecycle, `{eventType, key, systemApplication}`; `PROGRESS` rides its own topic. */
  applications: 'com.enonic.xp.app.settings:applications',
  /** A download in flight, `{url, percent}`, one message per percent. */
  applicationProgress: 'com.enonic.xp.app.settings:application-progress',
  /** Principal changes, `{operation, changes: [{kind, key}]}`. */
  principals: 'com.enonic.xp.app.settings:principals',
} as const;
