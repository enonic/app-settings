import { Outlet, useNavigate } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import { loadGroups, useGroups } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { GROUP_ACTIONS } from './model/groups.actions';
import { filterGroups } from './model/groups.filter';
import { toGroupRow } from './model/groups.rows';
import { groupsSearch } from './model/search.store';
import { groupsSelection } from './model/selection.store';

export function GroupsPage() {
  const t = useI18n();
  const navigate = useNavigate();
  const { status, items } = useGroups();

  const section = useBrowseSection({
    openItem: (key) => void navigate({ to: '/groups/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/groups', replace: true }),
    items,
    status,
    selection: groupsSelection,
    search: groupsSearch,
    filter: filterGroups,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (group) => toGroupRow(group, <Users size={24} strokeWidth={1.5} aria-hidden />),
    reload: () => void loadGroups(),
  });

  return (
    <BrowseScreen
      {...section}
      actions={GROUP_ACTIONS}
      emptyLabel={t('groups.list.empty')}
      details={<Outlet />}
    />
  );
}
