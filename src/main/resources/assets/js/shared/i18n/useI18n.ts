import { useStore } from '@nanostores/preact';
import { useCallback } from 'preact/hooks';

import { $phrases, localize, type PhraseValue } from './i18n.store';

export type Translate = (key: string, ...values: PhraseValue[]) => string;

export function useI18n(): Translate {
  const phrases = useStore($phrases);

  return useCallback(
    (key: string, ...values: PhraseValue[]) => localize(phrases, key, ...values),
    [phrases],
  );
}
