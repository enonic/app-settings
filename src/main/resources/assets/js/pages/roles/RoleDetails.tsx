import { Avatar, Button } from '@enonic/ui';
import { UserPen } from 'lucide-react';

import { idProviderOf, principalName, type Role } from '../../entities/principal';
import { getInitials } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { filledSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type RoleDetailsProps = {
  role: Role;
};

export function RoleDetails({ role }: RoleDetailsProps) {
  const t = useI18n();
  const { key, displayName, description, members } = role;

  // Users first, groups last, both flat: a group in a role is a row, not a branch.
  const memberSubsections = filledSections([
    { labelKey: 'roles.details.users', items: members.filter(({ type }) => type === 'user') },
    { labelKey: 'roles.details.groups', items: members.filter(({ type }) => type === 'group') },
  ]);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<UserPen size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={principalName(key)}
      />

      <DetailsPanel.Section
        labelKey="roles.details.role"
        action={
          // TODO: [#5] Opens the role wizard once it exists.
          <Button variant="outline" size="sm" label={t('roles.details.edit')} />
        }
      >
        {description !== undefined && (
          <DetailsPanel.Field labelKey="roles.details.description">
            {description}
          </DetailsPanel.Field>
        )}
      </DetailsPanel.Section>

      {members.length > 0 && (
        <DetailsPanel.Section labelKey="roles.details.members" count={members.length}>
          {memberSubsections.map(({ labelKey, items }) => (
            <DetailsPanel.Subsection key={labelKey} labelKey={labelKey} count={items.length}>
              <DetailsPanel.List>
                {items.map((member) => (
                  <DetailsPanel.ListItem
                    key={member.key}
                    icon={
                      <Avatar size="sm">
                        <Avatar.Fallback>{getInitials(member.displayName)}</Avatar.Fallback>
                      </Avatar>
                    }
                    title={member.displayName}
                    subtitle={principalName(member.key)}
                    meta={idProviderOf(member.key)}
                  />
                ))}
              </DetailsPanel.List>
            </DetailsPanel.Subsection>
          ))}
        </DetailsPanel.Section>
      )}
    </DetailsPanel>
  );
}
