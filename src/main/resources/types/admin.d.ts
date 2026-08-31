/**
 * `@enonic-types/lib-admin` 8.0.4 predates the admin events hub (XP #12253), so the two topic
 * functions are declared here on top of it until a release carries them.
 */
export * from '@enonic-types/lib-admin';

export interface SetTopicParams {
  /** Local topic name: 1-255 characters, no `:`, no whitespace. */
  name: string;
  /** Principals allowed to subscribe, besides `role:system.admin`. An empty array clears the topic. */
  allow: string | string[];
}

/** Registers or updates a topic owned by this application; answers the canonical `<app>:<name>`. */
export function setTopic(params: SetTopicParams): string;

/** Publishes to this application's topic; node-local, best effort, JSON-serializable, no nulls. */
export function sendToTopic(name: string, message?: object | string | number | boolean): void;
