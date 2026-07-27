import { useRouterState } from '@tanstack/react-router';

import { useI18n } from '../shared/i18n';
import { SECTIONS } from './navigation';

export function AppBar() {
  const t = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const section = SECTIONS.find(({ path }) => pathname.startsWith(path));

  return (
    <header className="bg-surface-neutral border-bdr-soft flex h-15 shrink-0 items-center border-b px-5 py-2">
      <h2 className="text-lg font-semibold">{section ? t(section.titleKey) : ''}</h2>
    </header>
  );
}
