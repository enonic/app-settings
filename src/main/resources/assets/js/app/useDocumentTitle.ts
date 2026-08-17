import { useEffect } from 'preact/hooks';

import { useI18n } from '../shared/i18n';

/**
 * The browser tab: `XP Settings / Roles`, and the app's own name alone where the path names no
 * section — which is what an empty `sectionTitle` says.
 */
export function useDocumentTitle(sectionTitle: string): void {
  const appTitle = useI18n('app.tabTitle');

  useEffect(() => {
    document.title = sectionTitle === '' ? appTitle : `${appTitle} / ${sectionTitle}`;
  }, [appTitle, sectionTitle]);
}
