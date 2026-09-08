import type { SectionExtension } from './extension.types';

/** One path segment, so nothing a section asks for can reach out of its own route. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

/**
 * The asked-for `config.path` where it is usable and unclaimed, the descriptor key otherwise. The
 * sections arrive in `(order, key)` order, so the earlier one keeps the slug and the loser falls back.
 */
export function assignSlugs(
  sections: readonly Omit<SectionExtension, 'slug'>[],
): SectionExtension[] {
  const taken = new Set<string>();

  return sections.map((section) => {
    const asked = section.path;
    const usable = asked != null && SLUG_PATTERN.test(asked) && !taken.has(asked);

    if (asked != null && !usable) {
      console.warn(
        `Section ${section.key} cannot have the path "${asked}"; using its key instead.`,
      );
    }

    const slug = usable ? asked : section.key;
    taken.add(slug);

    return { ...section, slug };
  });
}
