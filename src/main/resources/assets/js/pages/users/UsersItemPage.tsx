import { useParams } from '@tanstack/react-router';

import { useUser } from '../../entities/principal';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { UserDetails } from './UserDetails';

export function UsersItemPage() {
  const { id } = useParams({ strict: false });
  const user = useUser(id);

  if (!user) {
    return <DetailsEmpty labelKey="browse.details.empty" />;
  }

  return <UserDetails user={user} />;
}
