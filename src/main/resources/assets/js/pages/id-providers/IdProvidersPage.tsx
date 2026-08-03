import { useStore } from '@nanostores/preact';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { UserShield } from 'lucide-react';
import { useMemo } from 'preact/hooks';

import { loadIdProviders, useIdProviders } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { visibleEntries } from '../../widgets/browse-list/browse-filter';
import { sortByDisplayName, type SortDirection } from '../../widgets/browse-list/browse-sort';
import { BrowseFilter } from '../../widgets/browse-list/BrowseFilter';
import { BrowseSort } from '../../widgets/browse-list/BrowseSort';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { idProvidersFilter } from './model/filter.store';
import { ID_PROVIDER_ACTIONS } from './model/id-providers.actions';
import {
  applicationEntries,
  filterByApplication,
  searchIdProviders,
} from './model/id-providers.filter';
import { toIdProviderRow } from './model/id-providers.rows';
import { idProvidersSearch } from './model/search.store';
import { idProvidersSelection } from './model/selection.store';
import { $idProvidersSort, setIdProvidersSort } from './model/sort.store';

export function IdProvidersPage() {
  const t = useI18n();
  const navigate = useNavigate();
  const { status, items } = useIdProviders();
  const query = useStore(idProvidersSearch.$query);
  const selectedApplications = useStore(idProvidersFilter.$selected);
  const sort = useStore($idProvidersSort);

  const sortOptions = useMemo(
    () => [
      { id: 'asc', label: t('idProviders.sort.nameAsc') },
      { id: 'desc', label: t('idProviders.sort.nameDesc') },
    ],
    [t],
  ) satisfies readonly { id: SortDirection; label: string }[];

  // Shared with the filter entries below, so the query runs once per render rather than twice.
  const searched = useMemo(() => searchIdProviders(items, query), [items, query]);

  // Narrow first, order last.
  const visible = useMemo(
    () => sortByDisplayName(filterByApplication(searched, selectedApplications), sort),
    [searched, selectedApplications, sort],
  );

  // Entries follow the query but not the ticked applications, so the filter shrinks with the
  // search rather than restating the current narrowing.
  const entries = useMemo(
    () =>
      visibleEntries(
        applicationEntries(items, searched, t('idProviders.filter.unbound')),
        selectedApplications,
      ),
    [items, searched, selectedApplications, t],
  );

  const section = useBrowseSection({
    openItem: (key) =>
      void navigate({ to: '/id-providers/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/id-providers', replace: true }),
    items,
    status,
    selection: idProvidersSelection,
    search: idProvidersSearch,
    resetOnLeave: [idProvidersFilter],
    visible,
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
      filter={
        <BrowseFilter
          entries={entries}
          selected={selectedApplications}
          onToggle={(id) => idProvidersFilter.toggle(id)}
        />
      }
      sort={<BrowseSort options={sortOptions} value={sort} onChange={setIdProvidersSort} />}
    />
  );
}
