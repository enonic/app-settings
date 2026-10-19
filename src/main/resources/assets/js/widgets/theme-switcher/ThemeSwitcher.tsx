import { Button, cn, Tooltip } from '@enonic/ui';
import { useStore } from '@nanostores/preact';
import { Moon, Sun, SunMoon } from 'lucide-react';

import { $theme, cycleTheme, type Theme } from '../../shared/app-state';
import { useI18n } from '../../shared/i18n';

const THEME_SWITCHER_NAME = 'ThemeSwitcher';

const ICON_CLASS = 'absolute transition-all duration-300';
const SHOWN_CLASS = 'scale-100 rotate-0 opacity-100';
const HIDDEN_CLASS = 'scale-0 -rotate-90 opacity-0';

const TITLE_KEYS: Record<Theme, string> = {
  light: 'theme.light',
  dark: 'theme.dark',
  system: 'theme.system',
};

const ACTION_KEYS: Record<Theme, string> = {
  light: 'theme.switchToDark',
  dark: 'theme.switchToSystem',
  system: 'theme.switchToLight',
};

export type ThemeSwitcherProps = {
  className?: string;
};

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const theme = useStore($theme);

  const title = useI18n(TITLE_KEYS[theme]);
  const action = useI18n(ACTION_KEYS[theme]);

  return (
    <Tooltip value={title} side="bottom" delay={300} asChild>
      <Button
        data-component={THEME_SWITCHER_NAME}
        size="sm"
        variant="text"
        aria-label={action}
        onClick={cycleTheme}
        className={cn('relative size-9 rounded-sm p-0', className)}
      >
        <Sun
          className={cn(ICON_CLASS, theme === 'light' ? SHOWN_CLASS : HIDDEN_CLASS)}
          size={16}
          strokeWidth={1.5}
        />
        <Moon
          className={cn(ICON_CLASS, theme === 'dark' ? SHOWN_CLASS : HIDDEN_CLASS)}
          size={16}
          strokeWidth={1.5}
        />
        <SunMoon
          className={cn(ICON_CLASS, theme === 'system' ? SHOWN_CLASS : HIDDEN_CLASS)}
          size={18}
          strokeWidth={1.5}
        />
      </Button>
    </Tooltip>
  );
}

ThemeSwitcher.displayName = THEME_SWITCHER_NAME;
