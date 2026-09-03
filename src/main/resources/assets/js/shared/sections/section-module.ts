import type { SectionHost, SectionModule } from './contract';

/** The one runtime check the contract implies: a module the host can actually mount. */
export function isSectionModule(value: unknown): value is SectionModule<SectionHost> {
  return value != null && typeof (value as SectionModule<SectionHost>).mount === 'function';
}
