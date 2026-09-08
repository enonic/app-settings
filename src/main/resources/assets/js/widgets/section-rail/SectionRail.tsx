import { Tooltip } from '@enonic/ui';
import { Settings } from 'lucide-react';

import { useI18n } from '../../shared/i18n';

/** One discovered section. The title arrives localized, so the rail resolves no phrase for it. */
export type SectionRailItem = {
  key: string;
  title: string;
  iconUrl: string;
  href: string;
  active: boolean;
};

export type SectionRailProps = {
  sections: readonly SectionRailItem[];
};

const ITEM_CLASS =
  'text-main hover:bg-surface-neutral-hover data-[status=active]:bg-btn-active ' +
  'data-[status=active]:text-alt focus-visible:ring-ring flex size-10 items-center justify-center ' +
  'rounded-sm outline-none transition-colors focus-visible:ring-2';

export function SectionRail({ sections }: SectionRailProps) {
  const railLabel = useI18n('nav.sections');
  const appName = useI18n('app.displayName');

  return (
    <nav
      aria-label={railLabel}
      className="bg-surface-neutral border-bdr-soft flex h-full w-15 shrink-0 flex-col items-center gap-10 border-r px-1.75 py-2.5"
    >
      <Settings className="my-1.75 size-8 shrink-0" strokeWidth={1.5} aria-hidden />

      <h1 className="text-base font-semibold text-nowrap [writing-mode:vertical-lr]">{appName}</h1>

      <div className="flex h-full flex-col justify-between">
        <ul className="flex flex-col items-center gap-2">
          {sections.map(({ key, title, iconUrl, href, active }) => (
            <li key={key}>
              <Tooltip value={title} side="right" delay={300}>
                {/* A plain anchor: hash history routes it, and a remembered sub-path carries search
                    params, which a splat param cannot. */}
                <a
                  href={href}
                  aria-label={title}
                  aria-current={active ? 'page' : undefined}
                  data-status={active ? 'active' : undefined}
                  className={ITEM_CLASS}
                >
                  {/* Tinted, not inlined: the platform serves the icon as an image, and an svg
                      drawn in `currentColor` resolves that to black inside an `img`. */}
                  <span
                    className="size-6 bg-current"
                    style={{
                      maskImage: `url("${iconUrl}")`,
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                    }}
                  />
                </a>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
