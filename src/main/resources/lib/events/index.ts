import { initApplications } from './applications';
import { initPrincipals } from './principals';

export function init(): void {
  initApplications();
  initPrincipals();
}
