import { useStore } from '@nanostores/preact';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { UserPen } from 'lucide-react';
import { useMemo } from 'preact/hooks';

import { useRoles } from '../../entities/principal';
import { useProjects } from '../../entities/project';
import { useI18n } from '../../shared/i18n';
import { visibleEntries } from '../../widgets/browse-list/browse-filter';
import { sortByDisplayName, type SortDirection } from '../../widgets/browse-list/browse-sort';
import { BrowseFilter } from '../../widgets/browse-list/BrowseFilter';
import { BrowseSort } from '../../widgets/browse-list/BrowseSort';
import { BrowseScreen } from '../../widgets/browse-screen/BrowseScreen';
import { useBrowseSection } from '../../widgets/browse-screen/useBrowseSection';
import { rolesFilter } from './model/filter.store';
import { ROLE_ACTIONS } from './model/roles.actions';
import { filterRolesByBucket, roleBuckets, searchRoles } from './model/roles.filter';
import { toRoleRow } from './model/roles.rows';
import { loadRolesScreen } from './model/roles.screen';
import { rolesSearch } from './model/search.store';
import { rolesSelection } from './model/selection.store';
import { $rolesSort, setRolesSort } from './model/sort.store';
import { useRolesScreen } from './model/useRolesScreen';

export function RolesPage() {
  const t = useI18n();
  const navigate = useNavigate();
  // One request for the three domains this screen reads — the roles, the providers that name a member's
  // origin, and the projects that name a role's bucket.
  useRolesScreen();
  const { status, items } = useRoles();
  const { status: projectsStatus, items: projects } = useProjects();
  const query = useStore(rolesSearch.$query);
  const selectedBuckets = useStore(rolesFilter.$selected);
  const sort = useStore($rolesSort);

  const sortOptions = useMemo(
    () => [
      { id: 'asc', label: t('roles.sort.nameAsc') },
      { id: 'desc', label: t('roles.sort.nameDesc') },
    ],
    [t],
  ) satisfies readonly { id: SortDirection; label: string }[];

  // Shared with the bucket counts below, so the query runs once per render rather than twice.
  const searched = useMemo(() => searchRoles(items, query), [items, query]);

  // Narrow first, order last: sorting only what survived is the cheaper half, and the order the rows
  // appear in has to be the final word.
  const visible = useMemo(
    () => sortByDisplayName(filterRolesByBucket(searched, selectedBuckets), sort),
    [searched, selectedBuckets, sort],
  );

  // Counts follow the query but not the ticked buckets, so they answer "where did the search find
  // anything" rather than restating the current narrowing.
  const buckets = useMemo(
    () =>
      visibleEntries(
        roleBuckets(items, searched, projects, {
          system: t('roles.filter.system'),
          custom: t('roles.filter.custom'),
        }),
        selectedBuckets,
      ),
    [items, searched, projects, t, selectedBuckets],
  );

  const section = useBrowseSection({
    openItem: (key) => void navigate({ to: '/roles/$id', params: { id: key }, replace: true }),
    closeItem: () => void navigate({ to: '/roles', replace: true }),
    items,
    status,
    selection: rolesSelection,
    search: rolesSearch,
    resetOnLeave: [rolesFilter],
    visible,
    // A fresh icon element per row: Preact writes into a vnode as it renders it.
    toRow: (role) => toRoleRow(role, <UserPen size={24} strokeWidth={1.5} aria-hidden />),
    // One request again, so a project added since the last load reaches the filter along with the roles.
    reload: () => void loadRolesScreen(),
  });

  return (
    <BrowseScreen
      {...section}
      actions={ROLE_ACTIONS}
      emptyLabel={t('roles.list.empty')}
      details={<Outlet />}
      filter={
        <BrowseFilter
          entries={buckets}
          selected={selectedBuckets}
          onToggle={(id) => rolesFilter.toggle(id)}
          // A failed project load leaves the per-project entries out; saying so beats a short list
          // that looks complete.
          notice={projectsStatus === 'error' ? t('roles.filter.projectsFailed') : undefined}
        />
      }
      sort={<BrowseSort options={sortOptions} value={sort} onChange={setRolesSort} />}
    />
  );
}
