import type { Group } from '../../../entities/principal';
import { actionTargets, type SectionAction } from '../../../widgets/browse-toolbar/actions';

// TODO: [#6] The group wizard and the delete dialog arrive with the section's second pass.
function pending(): void {
  return undefined;
}

// ? No platform-owned groups to protect: `isSystem()` in lib-admin-ui covers system users and
// ? system or project roles, never groups. Whether `group:system:administrators` should be
// ? undeletable is a product question, not one the platform answers.
export const GROUP_ACTIONS: readonly SectionAction<Group>[] = [
  {
    id: 'new',
    labelKey: 'groups.action.new',
    enabled: () => true,
    run: pending,
  },
  {
    id: 'edit',
    labelKey: 'groups.action.edit',
    enabled: (ctx) => actionTargets(ctx).length === 1,
    run: pending,
  },
  {
    id: 'delete',
    labelKey: 'groups.action.delete',
    enabled: (ctx) => actionTargets(ctx).length > 0,
    run: pending,
  },
];
