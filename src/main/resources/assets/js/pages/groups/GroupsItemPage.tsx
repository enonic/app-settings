import { useParams } from '@tanstack/react-router';

import { useGroup } from '../../entities/principal';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { GroupDetails } from './GroupDetails';

export function GroupsItemPage() {
  const { id } = useParams({ strict: false });
  const group = useGroup(id);

  if (!group) {
    return <DetailsEmpty labelKey="browse.details.empty" />;
  }

  return <GroupDetails group={group} />;
}
