import { Outlet, useNavigate } from '@tanstack/react-router';
import { UserPen } from 'lucide-react';

import { loadRoles, useRoles } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { ROLE_ACTIONS } from './model/roles.actions';
import { filterRoles } from './model/roles.filter';
import { toRoleRow } from './model/roles.rows';
import { $rolesQuery, setRolesQuery } from './model/search.store';
import { rolesSelection } from './model/selection.store';

export function RolesPage() {
  const t = useI18n();
  const navigate = useNavigate();
  const { status, items } = useRoles();

  const section = useBrowseSection({
    openItem: (key) => void navigate({ to: '/roles/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/roles', replace: true }),
    items,
    status,
    selection: rolesSelection,
    $query: $rolesQuery,
    onQueryChange: setRolesQuery,
    filter: filterRoles,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (role) => toRoleRow(role, <UserPen size={24} strokeWidth={1.5} aria-hidden />),
    reload: () => void loadRoles(),
  });

  return (
    <BrowseScreen
      {...section}
      actions={ROLE_ACTIONS}
      emptyLabel={t('roles.list.empty')}
      details={<Outlet />}
    />
  );
}
