// Minimal types for the XP mustache lib (no official @enonic-types package).
// Resolved as the module for `/lib/mustache` via tsconfig `paths`.
export function render(view: unknown, params?: Record<string, unknown>): string;
