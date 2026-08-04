// Icons render in the browser only — the node tests just need the imports to resolve.
// Add an export here when a component under test starts using another icon.
function icon(): null {
  return null;
}

export const Box = icon;
export const ChevronDown = icon;
export const Star = icon;
