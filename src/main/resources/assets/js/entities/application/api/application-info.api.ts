import type { ResultAsync } from 'neverthrow';

import { type AppError, requestGraphQl } from '../../../shared/api';
import type {
  AdminExtensionItem,
  AdminToolItem,
  ApiItem,
  ApplicationIdProvider,
  ApplicationInfo,
  ApplicationItem,
  IdProviderMode,
} from '../model/application.types';

const APPLICATION_ITEM_FIELDS = `
  fragment ApplicationItemFields on ApplicationItem {
    key
    name
    displayName
    description
  }
`;

// The three admin lists are types of their own, each with one field the others lack, so they cannot
// share the fragment above.
const APPLICATION_INFO_QUERY = `
  ${APPLICATION_ITEM_FIELDS}
  query ApplicationInfo($key: String!) {
    applicationInfo(key: $key) {
      contentTypes { ...ApplicationItemFields }
      mixins { ...ApplicationItemFields }
      formFragments { ...ApplicationItemFields }
      pages { ...ApplicationItemFields }
      parts { ...ApplicationItemFields }
      layouts { ...ApplicationItemFields }
      macros { ...ApplicationItemFields }
      tasks { ...ApplicationItemFields }
      adminTools { key name displayName description url }
      adminExtensions { key name displayName description interfaces }
      apis { key name displayName description documentationUrl }
      deploymentUrl
      idProvider {
        mode
        usedBy { key displayName }
      }
    }
  }
`;

type ApplicationItemDto = {
  key: string;
  name: string;
  displayName: string;
  description: string | null;
};

type AdminToolItemDto = ApplicationItemDto & { url: string };
type AdminExtensionItemDto = ApplicationItemDto & { interfaces: string[] };
type ApiItemDto = ApplicationItemDto & { documentationUrl: string | null };

type IdProviderDto = {
  mode: IdProviderMode | null;
  usedBy: { key: string; displayName: string }[];
};

type ApplicationInfoDto = {
  contentTypes: ApplicationItemDto[];
  mixins: ApplicationItemDto[];
  formFragments: ApplicationItemDto[];
  pages: ApplicationItemDto[];
  parts: ApplicationItemDto[];
  layouts: ApplicationItemDto[];
  macros: ApplicationItemDto[];
  tasks: ApplicationItemDto[];
  adminTools: AdminToolItemDto[];
  adminExtensions: AdminExtensionItemDto[];
  apis: ApiItemDto[];
  deploymentUrl: string | null;
  idProvider: IdProviderDto | null;
};

type ApplicationInfoResult = { applicationInfo: ApplicationInfoDto | null };

export function fetchApplicationInfo(
  key: string,
  signal?: AbortSignal,
): ResultAsync<ApplicationInfo | undefined, AppError> {
  return requestGraphQl<ApplicationInfoResult>(APPLICATION_INFO_QUERY, { key }, signal).map(
    ({ applicationInfo }) =>
      applicationInfo == null ? undefined : toApplicationInfo(applicationInfo),
  );
}

// *
// * Internal
// *

function toItem(dto: ApplicationItemDto): ApplicationItem {
  return {
    key: dto.key,
    name: dto.name,
    displayName: dto.displayName,
    description: dto.description ?? undefined,
  };
}

function toAdminTool(dto: AdminToolItemDto): AdminToolItem {
  return { ...toItem(dto), url: dto.url };
}

function toAdminExtension(dto: AdminExtensionItemDto): AdminExtensionItem {
  return { ...toItem(dto), interfaces: dto.interfaces };
}

function toApi(dto: ApiItemDto): ApiItem {
  return { ...toItem(dto), documentationUrl: dto.documentationUrl ?? undefined };
}

function toIdProvider(dto: IdProviderDto): ApplicationIdProvider {
  return { mode: dto.mode ?? undefined, usedBy: dto.usedBy };
}

function toApplicationInfo(dto: ApplicationInfoDto): ApplicationInfo {
  return {
    contentTypes: dto.contentTypes.map(toItem),
    mixins: dto.mixins.map(toItem),
    formFragments: dto.formFragments.map(toItem),
    pages: dto.pages.map(toItem),
    parts: dto.parts.map(toItem),
    layouts: dto.layouts.map(toItem),
    macros: dto.macros.map(toItem),
    tasks: dto.tasks.map(toItem),
    adminTools: dto.adminTools.map(toAdminTool),
    adminExtensions: dto.adminExtensions.map(toAdminExtension),
    apis: dto.apis.map(toApi),
    deploymentUrl: dto.deploymentUrl ?? undefined,
    idProvider: dto.idProvider == null ? undefined : toIdProvider(dto.idProvider),
  };
}
