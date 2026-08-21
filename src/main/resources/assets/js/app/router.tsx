import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppShell } from './AppShell';
import { SectionRoute } from './SectionRoute';

// TODO: [extensions] The five sections move to app-applications and app-users as `settings.section`
// extensions; commented out rather than deleted until that path is proven.
// import { redirect } from '@tanstack/react-router';
// import type { JSX } from 'preact';
// import { ApplicationsItemPage } from '../pages/applications/ApplicationsItemPage';
// import { ApplicationsPage } from '../pages/applications/ApplicationsPage';
// import { GroupsItemPage } from '../pages/groups/GroupsItemPage';
// import { GroupsPage } from '../pages/groups/GroupsPage';
// import { IdProvidersItemPage } from '../pages/id-providers/IdProvidersItemPage';
// import { IdProvidersPage } from '../pages/id-providers/IdProvidersPage';
// import { RolesItemPage } from '../pages/roles/RolesItemPage';
// import { RolesPage } from '../pages/roles/RolesPage';
// import { UsersItemPage } from '../pages/users/UsersItemPage';
// import { UsersPage } from '../pages/users/UsersPage';
// import { DEFAULT_SECTION } from './navigation';

const rootRoute = createRootRoute({
  component: AppShell,
});

// Matches `/` so the router has something while discovery runs; `AppShell` redirects once it lands.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // beforeLoad: () => {
  //   throw redirect({ to: DEFAULT_SECTION.path });
  // },
});

// function sectionRoutes<Path extends string>(
//   path: Path,
//   SectionComponent: () => JSX.Element,
//   // An item component renders nothing while its section is still loading.
//   ItemComponent: () => JSX.Element | null,
// ) {
//   const sectionRoute = createRoute({
//     getParentRoute: () => rootRoute,
//     path,
//     component: SectionComponent,
//   });
//
//   const itemRoute = createRoute({
//     getParentRoute: () => sectionRoute,
//     path: '$id',
//     component: ItemComponent,
//   });
//
//   return sectionRoute.addChildren([itemRoute]);
// }

const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$slug',
  component: SectionRoute,
});

// The section's own sub-path. Opaque to the shell: it routes it, stores it, and hands it over.
const sectionSubPathRoute = createRoute({
  getParentRoute: () => sectionRoute,
  path: '$',
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sectionRoute.addChildren([sectionSubPathRoute]),
  // sectionRoutes('/applications', ApplicationsPage, ApplicationsItemPage),
  // sectionRoutes('/users', UsersPage, UsersItemPage),
  // sectionRoutes('/groups', GroupsPage, GroupsItemPage),
  // sectionRoutes('/roles', RolesPage, RolesItemPage),
  // sectionRoutes('/id-providers', IdProvidersPage, IdProvidersItemPage),
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
