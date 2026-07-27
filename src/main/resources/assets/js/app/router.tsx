import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import type { JSX } from 'preact';

import { ApplicationsItemPage } from '../pages/applications/ApplicationsItemPage';
import { ApplicationsPage } from '../pages/applications/ApplicationsPage';
import { GroupsItemPage } from '../pages/groups/GroupsItemPage';
import { GroupsPage } from '../pages/groups/GroupsPage';
import { IdProvidersItemPage } from '../pages/id-providers/IdProvidersItemPage';
import { IdProvidersPage } from '../pages/id-providers/IdProvidersPage';
import { RolesItemPage } from '../pages/roles/RolesItemPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { UsersItemPage } from '../pages/users/UsersItemPage';
import { UsersPage } from '../pages/users/UsersPage';
import { AppShell } from './AppShell';
import { DEFAULT_SECTION } from './navigation';

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: DEFAULT_SECTION.path });
  },
});

function sectionRoutes<Path extends string>(
  path: Path,
  SectionComponent: () => JSX.Element,
  ItemComponent: () => JSX.Element,
) {
  const sectionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: SectionComponent,
  });

  const itemRoute = createRoute({
    getParentRoute: () => sectionRoute,
    path: '$id',
    component: ItemComponent,
  });

  return sectionRoute.addChildren([itemRoute]);
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  sectionRoutes('/applications', ApplicationsPage, ApplicationsItemPage),
  sectionRoutes('/users', UsersPage, UsersItemPage),
  sectionRoutes('/groups', GroupsPage, GroupsItemPage),
  sectionRoutes('/roles', RolesPage, RolesItemPage),
  sectionRoutes('/id-providers', IdProvidersPage, IdProvidersItemPage),
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
