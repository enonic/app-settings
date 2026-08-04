import type { ResultAsync } from 'neverthrow';

import { type AppError, requestGraphQl } from '../../../shared/api';
import type { Application, ApplicationState } from '../model/application.types';

// The last three are the details panel's, not a row's: they are scalars off the application and
// descriptor this query already loads, while `applicationInfo` costs a jar walk per field.
const APPLICATION_ROW = `
  fragment ApplicationRow on Application {
    key
    displayName
    description
    version
    state
    system
    icon
    modifiedTime
    minSystemVersion
    maxSystemVersion
    vendorName
    vendorUrl
  }
`;

const APPLICATIONS_QUERY = `
  ${APPLICATION_ROW}
  query Applications {
    applications {
      ...ApplicationRow
    }
  }
`;

const APPLICATION_QUERY = `
  ${APPLICATION_ROW}
  query Application($key: String!) {
    application(key: $key) {
      ...ApplicationRow
    }
  }
`;

type ApplicationRowDto = {
  key: string;
  displayName: string;
  description: string | null;
  version: string | null;
  state: ApplicationState;
  system: boolean;
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
  return requestGraphQl<ApplicationsResult>(APPLICATIONS_QUERY, undefined, signal).map(
    ({ applications }) => applications.map(toApplication),
  );
}

export function fetchApplication(
  key: string,
  signal?: AbortSignal,
): ResultAsync<Application | undefined, AppError> {
  return requestGraphQl<ApplicationResult>(APPLICATION_QUERY, { key }, signal).map(
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
    icon: dto.icon ?? undefined,
    modifiedTime: dto.modifiedTime ?? undefined,
    minSystemVersion: dto.minSystemVersion ?? undefined,
    maxSystemVersion: dto.maxSystemVersion ?? undefined,
    vendorName: dto.vendorName ?? undefined,
    vendorUrl: dto.vendorUrl ?? undefined,
  };
}
