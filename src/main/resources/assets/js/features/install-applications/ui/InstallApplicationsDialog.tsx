import { cn, Dialog, SearchField } from '@enonic/ui';
import { useStore } from '@nanostores/preact';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { loadMarketApplications, useMarketApplications } from '../../../entities/market';
import { useI18n } from '../../../shared/i18n';
import { type ServerEvent, useServerEvent } from '../../../shared/server-events';
import { $installDialogOpen, closeInstallDialog } from '../model/install-dialog.store';
import { marketInstallIntent, runMarketInstall } from '../model/install-market-application';
import { toInstallProgress } from '../model/install-progress';
import { $marketInstalls, receiveInstallProgress } from '../model/install.store';
import {
  type MarketRow,
  searchMarketRows,
  sortMarketRows,
  toMarketRow,
} from '../model/market-rows';
import { runJarUpload } from '../model/upload-applications';
import { ConfirmMajorUpdate } from './ConfirmMajorUpdate';
import { MarketApplicationList } from './MarketApplicationList';
import { UploadJarButton } from './UploadJarButton';

/** Where an application comes from: Enonic Market, or a jar the operator has in front of them. */
export function InstallApplicationsDialog() {
  const open = useStore($installDialogOpen);
  const { status, items } = useMarketApplications();
  const installs = useStore($marketInstalls);

  const title = useI18n('applications.dialog.install.title');
  const searchPlaceholder = useI18n('applications.dialog.install.search');
  const clearLabel = useI18n('applications.dialog.install.searchClear');

  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<MarketRow | undefined>(undefined);

  const rows = useMemo(() => items.map(toMarketRow), [items]);
  const sorted = useMemo(() => sortMarketRows(rows), [rows]);
  const visible = useMemo(() => searchMarketRows(sorted, query), [sorted, query]);

  const handleServerEvent = useCallback((event: ServerEvent) => {
    const progress = toInstallProgress(event);
    if (progress != null) {
      receiveInstallProgress(progress.url, progress.percent);
    }
  }, []);

  useServerEvent(handleServerEvent);

  const handleOpenChange = (next: boolean): void => {
    if (next) {
      return;
    }

    setQuery('');
    setConfirming(undefined);
    closeInstallDialog();
  };

  const handleInstall = (row: MarketRow): void => {
    const intent = marketInstallIntent(row);

    if (intent === 'confirm') {
      setConfirming(row);
      return;
    }

    if (intent === 'install') {
      void runMarketInstall(row);
    }
  };

  const handleConfirm = (row: MarketRow): void => {
    setConfirming(undefined);
    void runMarketInstall(row);
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />

        <Dialog.Content
          className={cn('gap-6', confirming ? 'max-w-160' : 'max-w-4xl')}
          onEscapeKeyDown={(event) => {
            if (confirming) {
              event.preventDefault();
              setConfirming(undefined);
            }
          }}
        >
          {confirming ? (
            <ConfirmMajorUpdate
              row={confirming}
              onConfirm={() => handleConfirm(confirming)}
              onCancel={() => setConfirming(undefined)}
            />
          ) : (
            <>
              <Dialog.DefaultHeader title={title} withClose />

              <div className="flex shrink-0 items-center gap-4">
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder={searchPlaceholder}
                  clearLabel={clearLabel}
                  className="flex-1"
                >
                  <SearchField.Icon />
                  <SearchField.Input aria-label={searchPlaceholder} />
                  <SearchField.Clear />
                </SearchField>

                <UploadJarButton onFiles={(files) => void runJarUpload(files)} />
              </div>

              <Dialog.Body>
                <MarketApplicationList
                  status={status}
                  rows={visible}
                  searching={query.trim().length > 0}
                  installs={installs}
                  onInstall={handleInstall}
                  onRetry={() => void loadMarketApplications()}
                />
              </Dialog.Body>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
