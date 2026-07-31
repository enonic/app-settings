import { Avatar, Button } from '@enonic/ui';
import { UserPen, Users } from 'lucide-react';

import { type Group, idProviderOf, toPrincipalPath } from '../../entities/principal';
import { getInitials } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type GroupDetailsProps = {
  group: Group;
};

export function GroupDetails({ group }: GroupDetailsProps) {
  const t = useI18n();
  const { key, displayName, description, members, roles } = group;

  // Users first, groups last, both flat: a group inside a group is a row, not a branch.
  const memberGroups = [
    { labelKey: 'groups.details.users', members: members.filter(({ type }) => type === 'user') },
    { labelKey: 'groups.details.groups', members: members.filter(({ type }) => type === 'group') },
  ].filter((subsection) => subsection.members.length > 0);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<Users size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={toPrincipalPath(key)}
      />

      <DetailsPanel.Section
        labelKey="groups.details.info"
        action={
          // TODO: [#6] Opens the group wizard once it exists.
          <Button variant="outline" size="sm" label={t('groups.details.edit')} />
        }
      >
        {description && (
          <DetailsPanel.Field labelKey="groups.details.description">
            {description}
          </DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="groups.details.idProvider">
          {idProviderOf(key)}
        </DetailsPanel.Field>
      </DetailsPanel.Section>

      <DetailsPanel.Section labelKey="groups.details.members" count={members.length}>
        {memberGroups.map(({ labelKey, members: subsection }) => (
          <DetailsPanel.Subsection key={labelKey} labelKey={labelKey} count={subsection.length}>
            <DetailsPanel.List>
              {subsection.map((member) => (
                <DetailsPanel.ListItem
                  key={member.key}
                  icon={
                    <Avatar size="sm">
                      <Avatar.Fallback>{getInitials(member.displayName)}</Avatar.Fallback>
                    </Avatar>
                  }
                  title={member.displayName}
                  subtitle={toPrincipalPath(member.key)}
                  meta={idProviderOf(member.key)}
                />
              ))}
            </DetailsPanel.List>
          </DetailsPanel.Subsection>
        ))}
      </DetailsPanel.Section>

      <DetailsPanel.Section labelKey="groups.details.roles" count={roles.length}>
        <DetailsPanel.List>
          {roles.map((role) => (
            <DetailsPanel.ListItem
              key={role.key}
              icon={<UserPen size={24} strokeWidth={1.5} aria-hidden />}
              title={role.displayName}
              subtitle={toPrincipalPath(role.key)}
            />
          ))}
        </DetailsPanel.List>
      </DetailsPanel.Section>
    </DetailsPanel>
  );
}
