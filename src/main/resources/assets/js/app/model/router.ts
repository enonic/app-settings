import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppShell } from '../ui/AppShell';

// TODO: [extensions] The five sections move to app-applications and app-users as `settings.section`
// extensions; commented out rather than deleted until that path is proven.
// import { redirect } from '@tanstack/react-router';
// import type { JSX } from 'preact';
// import { ApplicationsItemPage } from '../../pages/applications/ApplicationsItemPage';
// import { ApplicationsPage } from '../../pages/applications/ApplicationsPage';
// import { GroupsItemPage } from '../../pages/groups/GroupsItemPage';
// import { GroupsPage } from '../../pages/groups/GroupsPage';
// import { IdProvidersItemPage } from '../../pages/id-providers/IdProvidersItemPage';
// import { IdProvidersPage } from '../../pages/id-providers/IdProvidersPage';
// import { RolesItemPage } from '../../pages/roles/RolesItemPage';
// import { RolesPage } from '../../pages/roles/RolesPage';
// import { UsersItemPage } from '../../pages/users/UsersItemPage';
// import { UsersPage } from '../../pages/users/UsersPage';
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

// Parses the url and nothing more: `AppShell` renders the sections, so that switching between them
// does not rest on whether the router remounts a component when only its param changes. The sub-path
// is the section's own and opaque here — the shell routes it, stores it, and hands it over.
//
// ! One template, splat included: a separate `$slug` parent would match every section root as well,
// ! and the router warns on every navigation that two templates resolve to the same url.
const sectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$slug/$',
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sectionRoute,
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
