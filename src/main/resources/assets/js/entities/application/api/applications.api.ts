import { errAsync, type ResultAsync } from 'neverthrow';

import {
  AppError,
  type GraphQlRoot,
  requestGraphQl,
  requestGraphQlDocument,
  requestJson,
  requestUploadJson,
} from '../../../shared/api';
import { $config } from '../../../shared/config';
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

// The wire shape both of XP core's install endpoints answer with (ApplicationInfoJson): the
// application as it now stands installed. Its key is core's, which need not be the key the market
// listed it as.
type InstalledApplicationDto = {
  key: string;
  version: string;
  /**
   * The descriptor's title. Absent rather than null for an application shipping none — core's mapper
   * is configured `NON_NULL` (`ObjectMapperHelper.create`).
   */
  title?: string;
};

export type InstallFromUrlParams = {
  /** A download url out of the market catalogue. */
  url: string;
  /**
   * The checksum the market published for that download. Core requires one unless the installation
   * turned `installUrl.checksumRequired` off, and the market has none for a release from before XP 8
   * — so this is optional here and core, which knows its own configuration, is what refuses.
   */
  sha512?: string;
};

export type InstallFromFileParams = {
  /** The jar the operator picked. */
  file: File;
  /** How much of it has gone out, 0–100. */
  onProgress?: (percent: number) => void;
};

export type InstalledApplication = {
  key: string;
  version: string;
  /** What to call it, for a caller that has no name of its own — an upload has only a file name. */
  displayName: string;
};

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

/** Installs an application from a url through XP's `server:app` api. */
export function postInstallApplicationFromUrl({
  url,
  sha512,
}: InstallFromUrlParams): ResultAsync<InstalledApplication, AppError> {
  const endpoint = $config.get()?.apis.serverApp.installUrl;

  if (endpoint == null) {
    return errAsync(new AppError('Tool config read before the app finished starting'));
  }

  return requestJson<InstalledApplicationDto>(endpoint, {
    method: 'POST',
    body: { URL: url, ...(sha512 != null && { sha512 }) },
  }).map(toInstalledApplication);
}

/** Installs an application from a jar the operator picked, through XP's `server:app` api. */
export function postInstallApplicationFromFile({
  file,
  onProgress,
}: InstallFromFileParams): ResultAsync<InstalledApplication, AppError> {
  const endpoint = $config.get()?.apis.serverApp.install;

  if (endpoint == null) {
    return errAsync(new AppError('Tool config read before the app finished starting'));
  }

  const formData = new FormData();
  formData.append('file', file);

  return requestUploadJson<InstalledApplicationDto>(endpoint, { formData, onProgress }).map(
    toInstalledApplication,
  );
}

// *
// * Internal
// *

// An application with no descriptor title is named by its key, which is what the browse list shows
// for it too.
function toInstalledApplication({
  key,
  version,
  title,
}: InstalledApplicationDto): InstalledApplication {
  return { key, version, displayName: title ?? key };
}

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
