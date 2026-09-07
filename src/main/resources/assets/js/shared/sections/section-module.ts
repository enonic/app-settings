import type { Module, RoutedHost } from '@enonic/ui-types';

/** The one runtime check the contract implies: a module the host can actually mount. */
export function isSectionModule(value: unknown): value is Module<RoutedHost> {
  return value != null && typeof (value as Module<RoutedHost>).mount === 'function';
}
