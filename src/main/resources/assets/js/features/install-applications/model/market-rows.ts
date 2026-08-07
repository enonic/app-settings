import type { MarketApplication } from '../../../entities/market';

/** What this instance can do with a market entry: install it, update it, or nothing. */
export type MarketRowStatus = 'install' | 'update' | 'installed';

export type MarketRow = {
  key: string;
  displayName: string;
  description?: string;
  iconUrl?: string;
  pageUrl?: string;
  availableVersion: string;
  installedVersion?: string;
  downloadUrl: string;
  sha512?: string;
  status: MarketRowStatus;
};

const STATUS_LABEL_KEYS: Record<MarketRowStatus, string> = {
  install: 'applications.dialog.install.install',
  update: 'applications.dialog.install.update',
  installed: 'applications.dialog.install.installed',
};

export function marketStatusLabelKey(status: MarketRowStatus): string {
  return STATUS_LABEL_KEYS[status];
}

export function toMarketRow(application: MarketApplication): MarketRow {
  return {
    key: application.key,
    displayName: application.displayName,
    description: application.description,
    iconUrl: application.iconUrl,
    pageUrl: application.pageUrl,
    availableVersion: application.latest.version,
    installedVersion: application.installedVersion,
    downloadUrl: application.latest.downloadUrl,
    sha512: application.latest.sha512,
    status: rowStatus(application),
  };
}

/** Whether the row's button does anything: an application on the latest version has nothing to do. */
export function canInstall({ status }: MarketRow): boolean {
  return status !== 'installed';
}

/**
 * Whether an update crosses a major version, which is the one case app-applications asks about first
 * kept deliberately, since a major release is where an application may change behaviour.
 */
export function isMajorUpdate({ installedVersion, availableVersion }: MarketRow): boolean {
  if (installedVersion == null) {
    return false;
  }

  return majorOf(availableVersion) > majorOf(installedVersion);
}

/**
 * Display name and description, case-insensitive, over the catalogue already loaded. The key is left
 * out where the section's own search includes it: an operator picks an application off the market by
 * the name it is advertised under, not by `com.enonic.app.*`.
 */
export function searchMarketRows(rows: readonly MarketRow[], query: string): MarketRow[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...rows];
  }

  return rows.filter(({ displayName, description }) =>
    [displayName, description].some((field) => field?.toLowerCase().includes(needle) ?? false),
  );
}

// *
// * Internal
// *

// `updateAvailable` is resolved server-side against the installed applications, so no version
// comparison happens here — see the market notes in `docs/unified-api.md`.
function rowStatus(application: MarketApplication): MarketRowStatus {
  if (application.installedVersion == null) {
    return 'install';
  }

  return application.updateAvailable ? 'update' : 'installed';
}

function majorOf(version: string): number {
  return Number.parseInt(version.split('.')[0] ?? '', 10);
}
