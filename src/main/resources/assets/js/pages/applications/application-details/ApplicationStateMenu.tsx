import { Button, Menu } from '@enonic/ui';
import { ChevronDown } from 'lucide-react';

import {
  type Application,
  startApplications,
  stopApplications,
} from '../../../entities/application';
import { useI18n } from '../../../shared/i18n';
import { isStartable, isStoppable } from '../model/application-lifecycle';
import { applicationStateLabelKey } from '../model/applications.rows';

export type ApplicationStateMenuProps = {
  application: Application;
};

/**
 * The application's state as a dropdown offering the opposite state. An application this tool must
 * not stop — a platform one, or the tool's own — gets a plain label instead.
 */
export function ApplicationStateMenu({ application }: ApplicationStateMenuProps) {
  const stateLabel = useI18n(applicationStateLabelKey(application.state));

  const stoppable = isStoppable(application);
  const actionLabel = useI18n(stoppable ? 'applications.action.stop' : 'applications.action.start');

  if (!stoppable && !isStartable(application)) {
    return <span className="text-subtle text-sm whitespace-nowrap">{stateLabel}</span>;
  }

  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="outline" size="sm" label={stateLabel} endIcon={ChevronDown} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="min-w-24">
          <Menu.Item
            onSelect={() =>
              void (stoppable ? stopApplications([application]) : startApplications([application]))
            }
          >
            {actionLabel}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
