import { cn, Dialog, SearchField, Tab } from '@enonic/ui';
import { useStore } from '@nanostores/preact';
import { Box } from 'lucide-react';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { loadMarketApplications, useMarketApplications } from '../../../entities/market';
import { useI18n } from '../../../shared/i18n';
import { type ServerEvent, useServerEvent } from '../../../shared/server-events';
import { DropZone } from '../../../shared/ui/DropZone';
import { $installDialogOpen, closeInstallDialog } from '../model/install-dialog.store';
import { marketInstallIntent, runMarketInstall } from '../model/install-market-application';
import { toInstallProgress } from '../model/install-progress';
import { $marketInstalls, receiveInstallProgress } from '../model/install.store';
import { JAR_ACCEPT } from '../model/jar-files';
import {
  type MarketRow,
  searchMarketRows,
  sortMarketRows,
  toMarketRow,
} from '../model/market-rows';
import { runJarUpload } from '../model/upload-applications';
import { ConfirmMajorUpdate } from './ConfirmMajorUpdate';
import { MarketApplicationList } from './MarketApplicationList';

const MARKET_TAB = 'market';
const UPLOAD_TAB = 'upload';

/** Where an application comes from: Enonic Market, or a jar the operator has in front of them. */
export function InstallApplicationsDialog() {
  const open = useStore($installDialogOpen);
  const { status, items } = useMarketApplications();
  const installs = useStore($marketInstalls);

  const title = useI18n('applications.dialog.install.title');
  const searchPlaceholder = useI18n('applications.dialog.install.search');
  const clearLabel = useI18n('applications.dialog.install.searchClear');
  const marketLabel = useI18n('applications.dialog.install.market');
  const uploadLabel = useI18n('applications.dialog.install.upload');
  const uploadHint = useI18n('applications.dialog.install.uploadHint');

  const [tab, setTab] = useState<string>(MARKET_TAB);
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

    setTab(MARKET_TAB);
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
          // A fixed height while browsing: the drop zone fills what it is given, and the dialog must
          // not resize as the tabs switch.
          className={cn('gap-6', confirming ? 'max-w-160' : 'h-176 max-w-4xl')}
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

              <Tab.Root value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-6">
                <Tab.List>
                  <Tab.Trigger value={MARKET_TAB}>{marketLabel}</Tab.Trigger>
                  <Tab.Trigger value={UPLOAD_TAB}>{uploadLabel}</Tab.Trigger>
                </Tab.List>

                <Tab.Content value={MARKET_TAB} className="mt-0 flex min-h-0 flex-1 flex-col gap-6">
                  <SearchField
                    value={query}
                    onChange={setQuery}
                    placeholder={searchPlaceholder}
                    clearLabel={clearLabel}
                  >
                    <SearchField.Icon />
                    <SearchField.Input aria-label={searchPlaceholder} />
                    <SearchField.Clear />
                  </SearchField>

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
                </Tab.Content>

                <Tab.Content value={UPLOAD_TAB} className="mt-0 min-h-0 flex-1">
                  <DropZone
                    accept={JAR_ACCEPT}
                    multiple
                    icon={<Box size={28} strokeWidth={1.5} aria-hidden />}
                    hint={uploadHint}
                    onFiles={(files) => void runJarUpload(files)}
                  />
                </Tab.Content>
              </Tab.Root>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
