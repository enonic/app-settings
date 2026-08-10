import { type Application, ApplicationIcon } from '../../../entities/application';
import { DetailsPanel } from '../../../widgets/details-panel/DetailsPanel';
import { ApplicationStateMenu } from './ApplicationStateMenu';

export type ApplicationDetailsHeaderProps = {
  application: Application;
};

export function ApplicationDetailsHeader({ application }: ApplicationDetailsHeaderProps) {
  return (
    <DetailsPanel.Header
      icon={
        <ApplicationIcon
          icon={application.icon}
          size="lg"
          system={application.system}
          local={application.local}
        />
      }
      title={application.displayName}
      subtitle={application.description}
      action={<ApplicationStateMenu application={application} />}
    />
  );
}
