import { useRouterState } from '@tanstack/react-router';

import { type SectionExtension, useSectionExtensions } from '../../entities/extension';
import { router } from './router';
import { readSubPath } from './section-path';

export type ActiveSection = {
  /** The first path segment, whether or not a section answers to it. */
  slug: string;
  section: SectionExtension | undefined;
  /** Where inside that section the url is, search params included. */
  subPath: string;
};

/** Read off the path rather than from route params, so the app bar can ask outside the route. */
export function useActiveSection(): ActiveSection {
  // The router state is only the re-render trigger; the values come from `router.history.location`,
  // the raw url — `router.state.location` re-serializes the search string and decodes the pathname,
  // and the sub-path is the guest's verbatim (see section-path.ts).
  useRouterState({ select: (state) => state.location.href });
  const { pathname, search } = router.history.location;
  const { items } = useSectionExtensions();

  const slug = pathname.split('/')[1] ?? '';

  return {
    slug,
    subPath: readSubPath(pathname, search, slug),
    section: items.find((section) => section.slug === slug),
  };
}
