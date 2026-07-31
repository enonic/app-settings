import { Button, cn, Tooltip } from '@enonic/ui';
import { useStore } from '@nanostores/preact';
import { Moon, Sun, SunMoon } from 'lucide-react';

import { $theme, cycleTheme, type Theme } from '../../shared/app-state';
import { useI18n } from '../../shared/i18n';

const STATE_KEYS: Record<Theme, string> = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
};

/** The button announces where the next click goes, not where the theme is now. */
const NEXT_KEYS: Record<Theme, string> = {
  light: 'theme.switchToDark',
  dark: 'theme.switchToSystem',
  system: 'theme.switchToLight',
};

// ? Grid stacking, not absolute positioning: the three icons share one centred cell, so they
// ? need no offsets and the button stays aligned whatever its parent does.
const iconClass = (shown: boolean): string =>
  cn(
    'col-start-1 row-start-1 transition-all duration-300',
    shown ? 'scale-100 rotate-0 opacity-100' : '-rotate-90 scale-0 opacity-0',
  );

export function ThemeSwitcher() {
  const t = useI18n();
  const theme = useStore($theme);

  return (
    <Tooltip value={t(STATE_KEYS[theme])} side="bottom" delay={300}>
      <Button
        variant="text"
        size="sm"
        onClick={cycleTheme}
        aria-label={t(NEXT_KEYS[theme])}
        className="grid size-9 shrink-0 place-items-center rounded-full p-0"
      >
        <Sun className={iconClass(theme === 'light')} size={16} strokeWidth={1.5} />
        <Moon className={iconClass(theme === 'dark')} size={16} strokeWidth={1.5} />
        <SunMoon className={iconClass(theme === 'system')} size={16} strokeWidth={1.5} />
      </Button>
    </Tooltip>
  );
}
