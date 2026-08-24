import { useRouterState } from '@tanstack/react-router';

import { type SectionExtension, useSectionExtensions } from '../../entities/extension';
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
  const slug = useRouterState({ select: (state) => state.location.pathname.split('/')[1] ?? '' });
  const subPath = useRouterState({
    select: (state) => readSubPath(state.location.pathname, state.location.searchStr, slug),
  });
  const { items } = useSectionExtensions();

  return { slug, subPath, section: items.find((section) => section.slug === slug) };
}
