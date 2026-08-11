import { Box, Laptop, Settings } from 'lucide-react';
import { useState } from 'preact/hooks';

import { i18n } from '../../../shared/i18n';
import { IconBadge } from '../../../shared/ui/IconBadge';

export type ApplicationIconProps = {
  /**
   * The `data:` uri the schema resolves from the application descriptor, or a market entry's remote
   * `iconUrl`.
   */
  icon?: string;
  /** `sm` for a list row, `lg` for the details header. */
  size?: 'sm' | 'lg';
  /**
   * The application's own flags, one corner badge each — an application can be both. Absent for an
   * icon standing for no installed application: a market entry, or the id provider form placeholder.
   */
  system?: boolean;
  local?: boolean;
};

const CLASSES = { sm: 'size-6', lg: 'size-12' } as const;
const PIXELS = { sm: 24, lg: 48 } as const;

/** An application's own icon where it has one, a generic package glyph where it does not. */
export function ApplicationIcon({ icon, size = 'sm', system, local }: ApplicationIconProps) {
  // ! The failing url rather than a flag: a `data:` uri cannot fail, but a market icon is fetched
  // ! from another host and may 404, and the same element is reused as rows are filtered in and out.
  const [failedIcon, setFailedIcon] = useState<string>();

  const glyph =
    icon == null || icon === failedIcon ? (
      <Box size={PIXELS[size]} strokeWidth={1.5} aria-hidden />
    ) : (
      <img
        src={icon}
        alt=""
        className={`${CLASSES[size]} object-contain`}
        onError={() => setFailedIcon(icon)}
      />
    );

  if (!system && !local) {
    return glyph;
  }

  const badgeSize = size === 'lg' ? 'md' : 'sm';

  return (
    <span className="relative inline-flex shrink-0">
      {glyph}

      {local && (
        <IconBadge
          icon={Laptop}
          color="var(--color-info)"
          size={badgeSize}
          label={i18n('applications.badge.local')}
          className="absolute -top-0.75 -right-0.75"
        />
      )}

      {system && (
        <IconBadge
          icon={Settings}
          color="var(--color-main)"
          size={badgeSize}
          label={i18n('applications.badge.system')}
          className="absolute -right-0.75 -bottom-0.75"
        />
      )}
    </span>
  );
}
