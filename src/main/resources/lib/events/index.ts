import { initApplications } from './applications';
import { initPrincipals } from './principals';

// ! Topic names here are half a contract constant: the platform composes `<appKey>:<localName>`,
// ! the canonical values are `HUB_TOPICS` in `shared/admin-events/topics.ts`, and `index.test.ts`
// ! pins one against the other through the app name gradle.properties builds.
export function init(): void {
  initApplications();
  initPrincipals();
}
