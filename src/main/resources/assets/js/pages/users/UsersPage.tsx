import { useStore } from '@nanostores/preact';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { CircleUserRound } from 'lucide-react';
import { useMemo } from 'preact/hooks';

import { loadUsers, useUsers } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { usersSearch } from './model/search.store';
import { usersSelection } from './model/selection.store';
import { USER_ACTIONS } from './model/users.actions';
import { filterUsers } from './model/users.filter';
import { toUserRow } from './model/users.rows';

export function UsersPage() {
  const t = useI18n();
  const navigate = useNavigate();
  const { status, items } = useUsers();
  const query = useStore(usersSearch.$query);

  // No filter or sort control here yet, so the search is all there is to narrow by.
  const visible = useMemo(() => filterUsers(items, query), [items, query]);

  const section = useBrowseSection({
    openItem: (key) => void navigate({ to: '/users/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/users', replace: true }),
    items,
    status,
    selection: usersSelection,
    search: usersSearch,
    visible,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (user) => toUserRow(user, <CircleUserRound size={24} strokeWidth={1.5} aria-hidden />),
    reload: () => void loadUsers(),
  });

  return (
    <BrowseScreen
      {...section}
      actions={USER_ACTIONS}
      emptyLabel={t('users.list.empty')}
      details={<Outlet />}
    />
  );
}
