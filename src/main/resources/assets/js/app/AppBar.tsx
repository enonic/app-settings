import { useRouterState } from '@tanstack/react-router';

import { ThemeSwitcher } from '../features/theme-switcher/ThemeSwitcher';
import { i18n } from '../shared/i18n';
import { SECTIONS } from './navigation';

export function AppBar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const section = SECTIONS.find(({ path }) => pathname.startsWith(path));
  // No section at all on a path outside them, so the title is resolved rather than hooked.
  const title = section === undefined ? '' : i18n(section.titleKey);

  // ! pr-24 keeps the bar clear of the XP admin widgets, which float over its right end.
  return (
    <header className="bg-surface-neutral border-bdr-soft flex h-15 shrink-0 items-center border-b py-2 pr-24 pl-5">
      <h2 className="text-lg font-semibold">{title}</h2>

      {/* TODO: Temporary spot — where the theme control belongs in the admin chrome is undecided. */}
      <div className="ml-auto flex items-center">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
