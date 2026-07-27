import { useParams } from '@tanstack/react-router';

import { useI18n } from '../../shared/i18n';

export function SectionItemPage() {
  const t = useI18n();
  const { id } = useParams({ strict: false });

  return <p className="text-subtle text-sm">{t('item.id', id ?? '')}</p>;
}
