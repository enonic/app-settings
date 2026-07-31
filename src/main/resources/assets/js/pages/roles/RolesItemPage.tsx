import { useParams } from '@tanstack/react-router';

import { useRole } from '../../entities/principal';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { RoleDetails } from './RoleDetails';

export function RolesItemPage() {
  const { id } = useParams({ strict: false });
  const role = useRole(id);

  // The id is unknown, or the section has not loaded yet: the column says the same thing it
  // says with no item route at all, never nothing.
  if (!role) {
    return <DetailsEmpty labelKey="browse.details.empty" />;
  }

  return <RoleDetails role={role} />;
}
