import { useParams } from '@tanstack/react-router';

import { useGroup } from '../../entities/principal';
import { detailsEmptyLabelKey } from '../../widgets/details-panel/details-panel';
import { DetailsEmpty } from '../../widgets/details-panel/DetailsEmpty';
import { GroupDetails } from './GroupDetails';

export function GroupsItemPage() {
  const { id } = useParams({ strict: false });
  const { status, item: group } = useGroup(id);

  if (group === undefined) {
    return <DetailsEmpty labelKey={detailsEmptyLabelKey(status, 'groups.details.failed')} />;
  }

  return <GroupDetails group={group} />;
}
