import { useParams } from '@tanstack/react-router';

import { useIdProvider } from '../../entities/principal';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { IdProviderDetails } from './IdProviderDetails';

export function IdProvidersItemPage() {
  const { id } = useParams({ strict: false });
  const provider = useIdProvider(id);

  if (!provider) {
    return <DetailsEmpty labelKey="browse.details.empty" />;
  }

  return <IdProviderDetails provider={provider} />;
}
