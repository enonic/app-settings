import { Box } from 'lucide-react';
import { useState } from 'preact/hooks';

export type ApplicationIconProps = {
  /**
   * The `data:` uri the schema resolves from the application descriptor, or a market entry's remote
   * `iconUrl`.
   */
  icon?: string;
  /** `sm` for a list row, `lg` for the details header. */
  size?: 'sm' | 'lg';
};

const CLASSES = { sm: 'size-6', lg: 'size-12' } as const;
const PIXELS = { sm: 24, lg: 48 } as const;

/** An application's own icon where it has one, a generic package glyph where it does not. */
export function ApplicationIcon({ icon, size = 'sm' }: ApplicationIconProps) {
  // ! The failing url rather than a flag: a `data:` uri cannot fail, but a market icon is fetched
  // ! from another host and may 404, and the same element is reused as rows are filtered in and out.
  const [failedIcon, setFailedIcon] = useState<string>();

  if (icon == null || icon === failedIcon) {
    return <Box size={PIXELS[size]} strokeWidth={1.5} aria-hidden />;
  }

  return (
    <img
      src={icon}
      alt=""
      className={`${CLASSES[size]} object-contain`}
      onError={() => setFailedIcon(icon)}
    />
  );
}
