import { useParams } from '@tanstack/react-router';

import { useUser } from '../../entities/principal';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { UserDetails } from './UserDetails';

export function UsersItemPage() {
  const { id } = useParams({ strict: false });
  const { status, user } = useUser(id);

  /*
   * ! Three states, not two, and conflating any pair of them lies to the reader. A user is shown while
   * ! one is there — including the previous one while the next loads, so stepping through rows does not
   * ! flash empty. With none: `loading` says a selection is on its way, because the panel is fetched by
   * ! key and 250 ms of debounce plus a queued request would otherwise read as a click that did nothing;
   * ! `error` says why there is nothing, and the store drops the user on failure so the panel cannot go on
   * ! describing someone other than the selected row.
   */
  if (user === undefined) {
    return <DetailsEmpty labelKey={emptyLabelKey(status)} />;
  }

  return <UserDetails user={user} />;
}

function emptyLabelKey(status: 'idle' | 'loading' | 'ready' | 'error'): string {
  if (status === 'loading') {
    return 'browse.details.loading';
  }

  return status === 'error' ? 'users.details.failed' : 'browse.details.empty';
}
