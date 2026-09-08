import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { AppShell } from '../ui/AppShell';

const rootRoute = createRootRoute({
  component: AppShell,
});

// Matches `/` so the router has something while discovery runs; `AppShell` redirects once it lands.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
});

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

const routeTree = rootRoute.addChildren([indexRoute, sectionRoute]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
