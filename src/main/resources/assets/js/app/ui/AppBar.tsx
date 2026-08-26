import { ThemeSwitcher } from '../../features/theme-switcher/ThemeSwitcher';
import { useActiveSection } from '../model/useActiveSection';
import { useDocumentTitle } from '../model/useDocumentTitle';

export function AppBar() {
  const { section } = useActiveSection();
  const title = section?.title ?? '';

  useDocumentTitle(title);

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
