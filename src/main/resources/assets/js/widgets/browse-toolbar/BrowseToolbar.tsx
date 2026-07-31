import { Button, Toolbar } from '@enonic/ui';

import { useI18n } from '../../shared/i18n';
import type { ActionContext, SectionAction } from './actions';

export type BrowseToolbarProps<T> = {
  actions: readonly SectionAction<T>[];
  context: ActionContext<T>;
};

export function BrowseToolbar<T>({ actions, context }: BrowseToolbarProps<T>) {
  const t = useI18n();

  return (
    <Toolbar.Root>
      <Toolbar.Container
        aria-label={t('browse.toolbar')}
        className="bg-surface-neutral border-bdr-soft flex h-15 shrink-0 items-center gap-2 border-b px-5 py-2"
      >
        {actions.map((action) => (
          // ! disabled belongs on Toolbar.Item, not on the Button: Slot lets the child win.
          <Toolbar.Item key={action.id} asChild disabled={!action.enabled(context)}>
            <Button
              variant="text"
              label={t(action.labelKey)}
              onClick={() => void action.run(context)}
            />
          </Toolbar.Item>
        ))}
      </Toolbar.Container>
    </Toolbar.Root>
  );
}
