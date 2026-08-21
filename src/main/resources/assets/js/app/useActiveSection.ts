import { useRouterState } from '@tanstack/react-router';

import { type SectionExtension, useSectionExtensions } from '../entities/extension';

export type ActiveSection = {
  /** The first path segment, whether or not a section answers to it. */
  slug: string;
  section: SectionExtension | undefined;
};

/** Read off the path rather than from route params, so the app bar can ask outside the route. */
export function useActiveSection(): ActiveSection {
  const slug = useRouterState({ select: (state) => state.location.pathname.split('/')[1] ?? '' });
  const { items } = useSectionExtensions();

  return { slug, section: items.find((section) => section.slug === slug) };
}
