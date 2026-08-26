/**
 * The guest's own root, isolated by construction: its stylesheet is adopted inside, and its
 * selectors and preflight cannot reach the shell. Re-entrant, since a root cannot be attached twice.
 */
export function openShadowContainer(element: HTMLElement): HTMLElement {
  const root = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
  const existing = root.firstElementChild;

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const container = document.createElement('div');
  // The guest lays its own screen out, so the wrapper must not become a box in between.
  container.style.display = 'contents';
  root.append(container);

  return container;
}
