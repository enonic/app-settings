import { useMemo } from 'preact/hooks';

import { SectionMount } from '../widgets/section-mount/SectionMount';
import { createSectionHost } from './createSectionHost';
import { useActiveSection } from './useActiveSection';

/**
 * What the `$slug` route renders. Nothing while discovery is still running or the slug names no
 * section — `useSectionRedirect` is what decides where an unanswered path goes.
 */
export function SectionRoute() {
  const { section } = useActiveSection();

  // One host object per section: a new one would remount the guest on every render.
  const host = useMemo(() => (section == null ? undefined : createSectionHost(section)), [section]);

  if (section == null || host == null) {
    return null;
  }

  return <SectionMount key={section.key} moduleUrl={section.moduleUrl} host={host} />;
}
