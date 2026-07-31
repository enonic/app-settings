import { Outlet, useNavigate } from '@tanstack/react-router';
import { UserShield } from 'lucide-react';

import { loadIdProviders, useIdProviders } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { ID_PROVIDER_ACTIONS } from './model/id-providers.actions';
import { filterIdProviders } from './model/id-providers.filter';
import { toIdProviderRow } from './model/id-providers.rows';
import { idProvidersSearch } from './model/search.store';
import { idProvidersSelection } from './model/selection.store';

export function IdProvidersPage() {
  const t = useI18n();
  const navigate = useNavigate();
  const { status, items } = useIdProviders();

  const section = useBrowseSection({
    openItem: (key) =>
      void navigate({ to: '/id-providers/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/id-providers', replace: true }),
    items,
    status,
    selection: idProvidersSelection,
    search: idProvidersSearch,
    filter: filterIdProviders,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (provider) =>
      toIdProviderRow(provider, <UserShield size={24} strokeWidth={1.5} aria-hidden />),
    reload: () => void loadIdProviders(),
  });

  return (
    <BrowseScreen
      {...section}
      actions={ID_PROVIDER_ACTIONS}
      emptyLabel={t('idProviders.list.empty')}
      details={<Outlet />}
    />
  );
}
