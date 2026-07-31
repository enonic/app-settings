import { errAsync, okAsync, type ResultAsync } from 'neverthrow';

import { AppError } from '../../../shared/api';
import type { IdProvider } from '../model/principal.types';
import {
  ADMIN_LOGIN_ROLE,
  ADMIN_ROLE,
  ADMINISTRATORS,
  ALICE,
  BOB,
  CAROL,
  CMS_ADMIN_ROLE,
  CMS_EXPERT_ROLE,
  CONTRIBUTORS,
  DEVELOPERS,
  EDITORS,
  ERIK,
  JANE,
  JOHN,
  MAJA,
  MARKETING,
  SU,
  SUPPORT,
} from './fixtures';

// TODO: [#8] Fixtures until the backend api settles. `getIdProviders` is server-side only, and by
// itself it is not enough — `lib/xp/auth` exposes no update or delete, so the section's own issue
// #4 needs platform work before it can do more than show what is here.
const ID_PROVIDERS: readonly IdProvider[] = [
  {
    key: 'system',
    displayName: 'System',
    description: 'The users the installation was set up with',
    idProviderConfig: { applicationKey: 'com.enonic.app.standardidprovider' },
    users: [SU, JANE, JOHN],
    groups: [ADMINISTRATORS, EDITORS, CONTRIBUTORS],
    roles: [ADMIN_ROLE, ADMIN_LOGIN_ROLE, CMS_ADMIN_ROLE, CMS_EXPERT_ROLE],
  },
  {
    key: 'ldap',
    displayName: 'Company directory',
    description: 'Everyone with a company account',
    idProviderConfig: { applicationKey: 'com.enonic.app.ldapidprovider' },
    users: [ALICE, BOB],
    groups: [DEVELOPERS],
    roles: [ADMIN_LOGIN_ROLE],
  },
  {
    // No `idProviderConfig`: bound to no application, so nothing logs in through it yet.
    key: 'partners',
    displayName: 'Partners',
    description: 'Accounts handed out to partner agencies',
    users: [CAROL],
    groups: [SUPPORT],
    roles: [],
  },
  {
    key: 'entraid',
    displayName: 'EntraID',
    description: 'Everyone with a company identity',
    idProviderConfig: { applicationKey: 'com.enonic.app.oidcidprovider' },
    users: [ERIK, MAJA],
    groups: [MARKETING],
    roles: [CMS_ADMIN_ROLE, CMS_EXPERT_ROLE],
  },
];

export function fetchIdProviders(signal?: AbortSignal): ResultAsync<IdProvider[], AppError> {
  if (signal?.aborted === true) {
    return errAsync(new AppError('Loading ID providers was cancelled'));
  }

  return okAsync([...ID_PROVIDERS]);
}
