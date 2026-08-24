import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';

import { useSectionExtensions } from '../../entities/extension';
import { useActiveSection } from './useActiveSection';

/**
 * Sends a path no section answers to — `/` included — to the first section the rail offers. A deep
 * link can only be judged once discovery has landed, so this waits for it rather than redirecting.
 * Silently: such a path only comes from a stale link, and where the user lands says where they are.
 */
export function useSectionRedirect(): void {
  const { status, items } = useSectionExtensions();
  const { slug } = useActiveSection();
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== 'ready' || items.length === 0) {
      return;
    }
    if (items.some((section) => section.slug === slug)) {
      return;
    }

    void navigate({ to: '/$slug/$', params: { slug: items[0].slug, _splat: '' }, replace: true });
  }, [status, items, slug, navigate]);
}
