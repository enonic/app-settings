import { Box } from 'lucide-react';

export type ApplicationIconProps = {
  /** The `data:` uri the schema resolves from the application descriptor. */
  icon?: string;
  /** `sm` for a list row, `lg` for the details header. */
  size?: 'sm' | 'lg';
};

const CLASSES = { sm: 'size-6', lg: 'size-12' } as const;
const PIXELS = { sm: 24, lg: 48 } as const;

/** An application's own icon where it has one, a generic package glyph where it does not. */
export function ApplicationIcon({ icon, size = 'sm' }: ApplicationIconProps) {
  if (icon == null) {
    return <Box size={PIXELS[size]} strokeWidth={1.5} aria-hidden />;
  }

  return <img src={icon} alt="" className={`${CLASSES[size]} object-contain`} />;
}
