import { passwordStrength as assess } from 'check-password-strength';

export type PasswordStrengthLevel = 'tooWeak' | 'weak' | 'medium' | 'strong';

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  score: 0 | 1 | 2 | 3 | 4;
  labelKey: string;
};

const LEVELS: Record<string, PasswordStrengthLevel> = {
  'Too weak': 'tooWeak',
  Weak: 'weak',
  Medium: 'medium',
  Strong: 'strong',
};

const SCORES: Record<PasswordStrengthLevel, 1 | 2 | 3 | 4> = {
  tooWeak: 1,
  weak: 2,
  medium: 3,
  strong: 4,
};

export function passwordStrength(value: string): PasswordStrength {
  if (value.length === 0) {
    return { level: 'tooWeak', score: 0, labelKey: 'users.dialog.strength.tooWeak' };
  }

  const level = LEVELS[assess(value).value] ?? 'tooWeak';

  return { level, score: SCORES[level], labelKey: `users.dialog.strength.${level}` };
}

export function isPasswordAccepted(strength: PasswordStrength): boolean {
  return strength.level === 'medium' || strength.level === 'strong';
}

const ALPHABET =
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-.<=>?@[]^_{|}~';

const GENERATED_LENGTH = 15;

export function generatePassword(): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_LENGTH));
    const candidate = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');

    if (isPasswordAccepted(passwordStrength(candidate))) {
      return candidate;
    }
  }

  return '';
}
