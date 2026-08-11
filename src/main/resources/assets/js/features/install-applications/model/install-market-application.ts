import { installApplication } from '../../../entities/application';
import { marketLoadSettled } from '../../../entities/market';
import { beginInstall, endInstall, isInstalling } from './install.store';
import { canInstall, isMajorUpdate, type MarketRow } from './market-rows';

/** What a press of a row's button amounts to. */
export type MarketInstallIntent = 'ignore' | 'confirm' | 'install';

/**
 * Whether a press installs, asks first, or is not a press at all — a row already installing, or one
 * on the latest version. An update across a major version asks, as app-applications does.
 *
 * ? It answers rather than acts because the confirmation is a view of the install dialog: what the
 * ? operator is asked about is a row that dialog is already holding, so nothing outside it has to
 * ? keep that row anywhere.
 */
export function marketInstallIntent(row: MarketRow): MarketInstallIntent {
  if (!canInstall(row) || isInstalling(row.key)) {
    return 'ignore';
  }

  return isMajorUpdate(row) ? 'confirm' : 'install';
}

/**
 * Installs the row and leaves it in its installing state until the catalogue has caught up.
 *
 * ? It waits rather than reloads: core publishes INSTALLED before it answers the install — the app is
 * ? started in between — so `market.service` has the reload out well before this returns, and asking
 * ? for one here would be a second call to Enonic Market for one install.
 */
export async function runMarketInstall(row: MarketRow): Promise<void> {
  beginInstall(row.key, row.downloadUrl);

  const result = await installApplication({
    displayName: row.displayName,
    url: row.downloadUrl,
    sha512: row.sha512,
    updating: row.status === 'update',
  });

  if (result.isOk()) {
    await marketLoadSettled();
  }

  endInstall(row.key);
}
