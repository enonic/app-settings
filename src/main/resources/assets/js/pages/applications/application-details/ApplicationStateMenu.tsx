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
  const t = useI18n();

  const stateLabel = t(applicationStateLabelKey(application.state));
  const stoppable = isStoppable(application);

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
            {t(stoppable ? 'applications.action.stop' : 'applications.action.start')}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
