import { Tooltip } from '@enonic/ui';
import { Link, type LinkProps } from '@tanstack/react-router';
import { Settings, type LucideIcon } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { ServerEventsIndicator } from '../server-events-indicator/ServerEventsIndicator';

export type SectionRailItem = {
  id: string;
  path: LinkProps['to'];
  icon: LucideIcon;
  labelKey: string;
};

export type SectionRailProps = {
  sections: readonly SectionRailItem[];
};

const ITEM_CLASS =
  'text-subtle hover:bg-surface-neutral-hover hover:text-main data-[status=active]:bg-btn-active ' +
  'data-[status=active]:text-alt focus-visible:ring-ring flex size-10 items-center justify-center ' +
  'rounded-sm outline-none transition-colors focus-visible:ring-2';

export function SectionRail({ sections }: SectionRailProps) {
  const t = useI18n();

  return (
    <nav
      aria-label={t('nav.sections')}
      className="bg-surface-neutral border-bdr-soft flex h-full w-15 shrink-0 flex-col items-center gap-10 border-r px-1.75 py-2.5"
    >
      <Settings className="my-1.75 size-8 shrink-0" strokeWidth={1.5} aria-hidden />

      <h1 className="text-base font-semibold text-nowrap [writing-mode:vertical-lr]">
        {t('app.displayName')}
      </h1>

      <div className="flex h-full flex-col justify-between">
        <ul className="flex flex-col items-center gap-2">
          {sections.map(({ id, path, icon: Icon, labelKey }) => {
            const label = t(labelKey);

            return (
              <li key={id}>
                <Tooltip value={label} side="right" delay={300}>
                  <Link to={path} aria-label={label} className={ITEM_CLASS}>
                    <Icon size={24} strokeWidth={1.5} aria-hidden />
                  </Link>
                </Tooltip>
              </li>
            );
          })}
        </ul>

        <ServerEventsIndicator />
      </div>
    </nav>
  );
}
