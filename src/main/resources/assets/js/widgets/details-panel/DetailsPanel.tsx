import { ListItem, Separator } from '@enonic/ui';
import type { ReactNode } from 'react';

import { useI18n } from '../../shared/i18n';
import { ItemLabel } from '../item-label/ItemLabel';
import { withCount } from './details-panel';
import { DetailsEmpty } from './DetailsEmpty';

export type DetailsPanelProps = {
  children: ReactNode;
};

export type DetailsHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Top-right control, e.g. the Applications state dropdown. */
  action?: ReactNode;
};

export type DetailsSectionProps = {
  labelKey: string;
  /** Appended to the label as `(7)`. */
  count?: number;
  /** Rendered at the end of the section, e.g. the Edit button. */
  action?: ReactNode;
  children: ReactNode;
};

export type DetailsSubsectionProps = {
  labelKey: string;
  /** Appended to the label as `(6)`. */
  count?: number;
  children: ReactNode;
};

export type DetailsFieldProps = {
  labelKey: string;
  children: ReactNode;
};

export type DetailsListProps = {
  children: ReactNode;
};

export type DetailsListItemProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Right-aligned, single cell — not the array `BrowseRow.meta` uses. */
  meta?: ReactNode;
};

function DetailsPanelRoot({ children }: DetailsPanelProps) {
  return <div className="flex min-h-0 flex-col gap-5 overflow-auto p-10">{children}</div>;
}

export function DetailsHeader({ title, subtitle, icon, action }: DetailsHeaderProps) {
  return (
    <div className="flex items-center gap-5">
      {icon && <div className="flex size-12 shrink-0 items-center justify-center">{icon}</div>}

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="truncate text-2xl font-semibold">{title}</h3>
        {subtitle && <p className="text-subtle truncate text-base">{subtitle}</p>}
      </div>

      {action}
    </div>
  );
}

export function DetailsSection({ labelKey, count, action, children }: DetailsSectionProps) {
  const t = useI18n();

  return (
    <section className="flex flex-col gap-2.5">
      <Separator label={withCount(t(labelKey), count)} className="text-base" />
      {children}
      {action && <div className="flex justify-end">{action}</div>}
    </section>
  );
}

export function DetailsSubsection({ labelKey, count, children }: DetailsSubsectionProps) {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-sm font-semibold">{withCount(t(labelKey), count)}</h4>
      {children}
    </div>
  );
}

export function DetailsField({ labelKey, children }: DetailsFieldProps) {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold">{t(labelKey)}</span>
      <span className="text-xs font-normal wrap-anywhere">{children}</span>
    </div>
  );
}

export function DetailsList({ children }: DetailsListProps) {
  return (
    <div role="list" className="flex flex-col">
      {children}
    </div>
  );
}

export function DetailsListItem({ title, subtitle, icon, meta }: DetailsListItemProps) {
  return (
    <ListItem className="px-0">
      <ListItem.Content>
        <ItemLabel icon={icon} primary={title} secondary={subtitle} />
      </ListItem.Content>
      <ListItem.Right>
        {meta && <span className="text-subtle text-sm whitespace-nowrap">{meta}</span>}
      </ListItem.Right>
    </ListItem>
  );
}

export const DetailsPanel = Object.assign(DetailsPanelRoot, {
  Empty: DetailsEmpty,
  Header: DetailsHeader,
  Section: DetailsSection,
  Subsection: DetailsSubsection,
  Field: DetailsField,
  List: DetailsList,
  ListItem: DetailsListItem,
});
