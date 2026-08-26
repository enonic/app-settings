import { useEffect } from 'preact/hooks';

import { useSectionExtensions } from '../../entities/extension';
import { router } from './router';
import { sectionPath } from './section-path';
import { useActiveSection } from './useActiveSection';

/**
 * Sends a path no section answers to — `/` included — to the first section the rail offers. A deep
 * link can only be judged once discovery has landed, so this waits for it rather than redirecting.
 * Silently: such a path only comes from a stale link, and where the user lands says where they are.
 */
export function useSectionRedirect(): void {
  const { status, items } = useSectionExtensions();
  const { slug } = useActiveSection();

  useEffect(() => {
    if (status !== 'ready' || items.length === 0) {
      return;
    }
    if (items.some((section) => section.slug === slug)) {
      return;
    }

    // ! Through history, as every shell navigation: `router.navigate` percent-encodes a path param
    // ! (`:` → `%3A`) while `decodeURI` on the way back leaves `%3A` in place, so a section whose
    // ! slug fell back to its descriptor key would never match what was pushed.
    router.history.replace(sectionPath(items[0].slug, ''));
  }, [status, items, slug]);
}
