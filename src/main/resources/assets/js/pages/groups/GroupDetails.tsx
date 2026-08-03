import { Avatar, Button } from '@enonic/ui';
import { UserPen, Users } from 'lucide-react';

import { type Group, principalName, useIdProviderName } from '../../entities/principal';
import { getInitials } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { filledSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type GroupDetailsProps = {
  group: Group;
};

export function GroupDetails({ group }: GroupDetailsProps) {
  const t = useI18n();
  const providerName = useIdProviderName();
  const { key, displayName, description, members, roles } = group;

  // Users first, groups last, both flat: a group inside a group is a row, not a branch.
  const memberSubsections = filledSections([
    {
      labelKey: 'groups.details.users',
      items: members.filter(({ type }) => type === 'user'),
    },
    {
      labelKey: 'groups.details.groups',
      items: members.filter(({ type }) => type === 'group'),
    },
  ]);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<Users size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={principalName(key)}
      />

      <DetailsPanel.Section
        labelKey="groups.details.info"
        action={
          // TODO: [#6] Opens the group wizard once it exists.
          <Button variant="outline" size="sm" label={t('groups.details.edit')} />
        }
      >
        {description !== undefined && (
          <DetailsPanel.Field labelKey="groups.details.description">
            {description}
          </DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="groups.details.idProvider">
          {providerName(key)}
        </DetailsPanel.Field>
      </DetailsPanel.Section>

      {members.length > 0 && (
        <DetailsPanel.Section labelKey="groups.details.members" count={members.length}>
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
                    meta={providerName(member.key)}
                  />
                ))}
              </DetailsPanel.List>
            </DetailsPanel.Subsection>
          ))}
        </DetailsPanel.Section>
      )}

      {roles.length > 0 && (
        <DetailsPanel.Section labelKey="groups.details.roles" count={roles.length}>
          <DetailsPanel.List>
            {roles.map((role) => (
              <DetailsPanel.ListItem
                key={role.key}
                icon={<UserPen size={24} strokeWidth={1.5} aria-hidden />}
                title={role.displayName}
                subtitle={principalName(role.key)}
              />
            ))}
          </DetailsPanel.List>
        </DetailsPanel.Section>
      )}
    </DetailsPanel>
  );
}
