import { errAsync, type ResultAsync } from 'neverthrow';

import { AppError, requestJson } from '../../../shared/api';
import { $config } from '../../../shared/config';
import { DEFAULT_ORDER, type SectionExtension } from '../model/extension.types';
import { assignSlugs } from '../model/section-slugs';

/** The interface `admin/tools/main/main.yaml` publishes. An extension must declare it to mount here. */
const SECTION_INTERFACE = 'settings.section';

/** Fixed by the contract, so the host needs no lookup — see `docs/extensions.md` § 2. */
const MODULE_PATH = '_static/main.js';

// The discovery row, already localized and already filtered by the caller's principals.
type ExtensionDto = {
  key: string;
  title: string;
  description?: string;
  iconUrl?: string;
  /** Only `<app>:<name>` — the endpoint has to be put back in front of it. */
  url: string;
  interfaces?: string[];
  /** Never absent, `{}` where the descriptor declares none. Not localized, and nothing validates it. */
  config?: Record<string, unknown>;
};

export function fetchSectionExtensions(
  signal?: AbortSignal,
): ResultAsync<SectionExtension[], AppError> {
  const base = $config.get()?.apis.extensions;

  if (base == null) {
    return errAsync(new AppError('Tool config read before the app finished starting'));
  }

  const url = `${base}?interface=${encodeURIComponent(SECTION_INTERFACE)}`;

  return requestJson<ExtensionDto[]>(url, { signal }).map((dtos) =>
    assignSlugs(dtos.map((dto) => toSectionRow(dto, base)).sort(byOrderThenKey)),
  );
}

//
// * Internal
//

function toSectionRow(dto: ExtensionDto, base: string): Omit<SectionExtension, 'slug'> {
  const order = Number(dto.config?.order);
  const path = dto.config?.path;

  // ! `url` is a descriptor key and `iconUrl` a bare query string (`?icon&app=…`), so the first
  // ! takes a separator and the second must not — see `docs/platform-facts.md`.
  const prefix = `${base}/${dto.url}`;

  return {
    key: dto.key,
    title: dto.title,
    description: dto.description,
    url: prefix,
    moduleUrl: `${prefix}/${MODULE_PATH}`,
    iconUrl: `${base}${dto.iconUrl ?? ''}`,
    order: Number.isFinite(order) ? order : DEFAULT_ORDER,
    path: typeof path === 'string' ? path : undefined,
  };
}

/** The key breaks a tie because it is the identity; a localized title is neither stable nor unique. */
function byOrderThenKey(
  a: Omit<SectionExtension, 'slug'>,
  b: Omit<SectionExtension, 'slug'>,
): number {
  return a.order - b.order || a.key.localeCompare(b.key);
}
