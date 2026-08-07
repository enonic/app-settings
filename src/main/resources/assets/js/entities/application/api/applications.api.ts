import type { ResultAsync } from 'neverthrow';

import {
  type AppError,
  type GraphQlRoot,
  requestGraphQl,
  requestGraphQlDocument,
} from '../../../shared/api';
import type { Application, ApplicationState } from '../model/application.types';

// The last five are the details panel's, not a row's: they are scalars off the application and
// descriptor this query already loads, while `applicationInfo` costs a jar walk per field.
const APPLICATION_FIELDS = `
  key
  displayName
  description
  version
  state
  system
  local
  icon
  modifiedTime
  minSystemVersion
  maxSystemVersion
  vendorName
  vendorUrl
`;

export const APPLICATIONS_ROOT: GraphQlRoot = {
  field: 'applications',
  selection: `{${APPLICATION_FIELDS}}`,
};

// ! A document rather than a root: `application(key:)` answers `null` for a key nothing is installed
// ! under, which is an answer the store acts on — it drops the row — and `requestGraphQl` treats a
// ! missing field as a failure.
const APPLICATION_DOCUMENT = `
  query Application($key: String!) {
    application(key: $key) {${APPLICATION_FIELDS}}
  }
`;

type ApplicationRowDto = {
  key: string;
  displayName: string;
  description: string | null;
  version: string | null;
  state: ApplicationState;
  system: boolean;
  local: boolean;
  icon: string | null;
  modifiedTime: string | null;
  minSystemVersion: string | null;
  maxSystemVersion: string | null;
  vendorName: string | null;
  vendorUrl: string | null;
};

type ApplicationsResult = { applications: ApplicationRowDto[] };

type ApplicationResult = { application: ApplicationRowDto | null };

export function fetchApplications(signal?: AbortSignal): ResultAsync<Application[], AppError> {
  return requestGraphQl<ApplicationsResult>(APPLICATIONS_ROOT, { signal }).map(({ applications }) =>
    applications.map(toApplication),
  );
}

export function fetchApplication(
  key: string,
  signal?: AbortSignal,
): ResultAsync<Application | undefined, AppError> {
  return requestGraphQlDocument<ApplicationResult>(APPLICATION_DOCUMENT, { key }, signal).map(
    ({ application }) => (application == null ? undefined : toApplication(application)),
  );
}

// *
// * Internal
// *

function toApplication(dto: ApplicationRowDto): Application {
  return {
    key: dto.key,
    displayName: dto.displayName,
    description: dto.description ?? undefined,
    version: dto.version ?? undefined,
    state: dto.state,
    system: dto.system,
    local: dto.local,
    icon: dto.icon ?? undefined,
    modifiedTime: dto.modifiedTime ?? undefined,
    minSystemVersion: dto.minSystemVersion ?? undefined,
    maxSystemVersion: dto.maxSystemVersion ?? undefined,
    vendorName: dto.vendorName ?? undefined,
    vendorUrl: dto.vendorUrl ?? undefined,
  };
}
