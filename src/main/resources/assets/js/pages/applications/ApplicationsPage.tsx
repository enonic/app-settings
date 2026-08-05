import { useStore } from '@nanostores/preact';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'preact/hooks';

import { $applications, ApplicationIcon, loadApplications } from '../../entities/application';
import { UninstallApplicationsDialog } from '../../features/uninstall-applications/ui/UninstallApplicationsDialog';
import { i18n, useI18n } from '../../shared/i18n';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { APPLICATION_ACTIONS } from './model/applications.actions';
import { filterApplications } from './model/applications.filter';
import { applicationStateLabelKey, toApplicationRow } from './model/applications.rows';
import { applicationsSearch } from './model/search.store';
import { applicationsSelection } from './model/selection.store';
import { useApplicationsScreen } from './model/useApplicationsScreen';

export function ApplicationsPage() {
  const navigate = useNavigate();
  useApplicationsScreen();
  const { status, items } = useStore($applications);
  const query = useStore(applicationsSearch.$query);

  const emptyLabel = useI18n('applications.list.empty');

  // The whole list is loaded, so the search narrows it here rather than on the server.
  const visible = useMemo(() => filterApplications(items, query), [items, query]);

  const section = useBrowseSection({
    openItem: (key) =>
      void navigate({ to: '/applications/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/applications', replace: true }),
    items,
    status,
    selection: applicationsSelection,
    search: applicationsSearch,
    visible,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (application) =>
      toApplicationRow(
        application,
        <ApplicationIcon icon={application.icon} />,
        i18n(applicationStateLabelKey(application.state)),
      ),
    reload: () => void loadApplications(),
  });

  return (
    <>
      <BrowseScreen
        {...section}
        actions={APPLICATION_ACTIONS}
        emptyLabel={emptyLabel}
        details={<Outlet />}
      />

      <UninstallApplicationsDialog />
    </>
  );
}
