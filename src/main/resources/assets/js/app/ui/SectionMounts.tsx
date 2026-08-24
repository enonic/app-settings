import { useRef, useState } from 'preact/hooks';

import { useSectionExtensions, type SectionExtension } from '../../entities/extension';
import { SectionMount } from '../../widgets/section-mount/SectionMount';
import { createSectionHost } from '../model/createSectionHost';
import { useActiveSection } from '../model/useActiveSection';

/**
 * Every section the user has visited, mounted, with only the active one shown — so a switch leaves
 * the DOM, the scroll position and a half-filled dialog exactly where they were. Unmount happens
 * when a section leaves discovery and drops out of this list.
 */
export function SectionMounts() {
  const { items } = useSectionExtensions();
  const { section: active } = useActiveSection();
  const visited = useRef(new Set<string>());

  // Recorded during render on purpose: the slot has to exist in the pass that activated it.
  if (active != null) {
    visited.current.add(active.key);
  }

  return (
    <>
      {sectionSlots(items, visited.current, active?.key).map(({ section, hidden }) => (
        <SectionSlot key={section.key} section={section} hidden={hidden} />
      ))}
    </>
  );
}

//
// * Internal
//

type SectionSlotState = {
  section: SectionExtension;
  hidden: boolean;
};

/** A section that has left discovery gets no slot, which is what disposes its mount. */
function sectionSlots(
  items: readonly SectionExtension[],
  visited: ReadonlySet<string>,
  activeKey: string | undefined,
): SectionSlotState[] {
  return items
    .filter(({ key }) => visited.has(key))
    .map((section) => ({ section, hidden: section.key !== activeKey }));
}

/** One section's place in the shell. Its host object lives exactly as long as this slot does. */
function SectionSlot({ section, hidden }: SectionSlotState) {
  // ! `useState`, not `useMemo`: a discarded memo would hand the guest a new host and remount it.
  const [host] = useState(() => createSectionHost(section));

  return <SectionMount moduleUrl={section.moduleUrl} host={host} hidden={hidden} />;
}
