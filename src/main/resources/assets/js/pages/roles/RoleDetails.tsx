import { Avatar, Button } from '@enonic/ui';
import { UserPen } from 'lucide-react';

import { idProviderOf, type Role, toPrincipalPath } from '../../entities/principal';
import { getInitials } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type RoleDetailsProps = {
  role: Role;
};

export function RoleDetails({ role }: RoleDetailsProps) {
  const t = useI18n();
  const { key, displayName, description, members } = role;

  const memberGroups = [
    { labelKey: 'roles.details.users', members: members.filter(({ type }) => type === 'user') },
    { labelKey: 'roles.details.groups', members: members.filter(({ type }) => type === 'group') },
  ].filter((group) => group.members.length > 0);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<UserPen size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={toPrincipalPath(key)}
      />

      <DetailsPanel.Section
        labelKey="roles.details.role"
        action={
          // TODO: [#5] Opens the role wizard once it exists.
          <Button variant="outline" size="sm" label={t('roles.details.edit')} />
        }
      >
        {description && (
          <DetailsPanel.Field labelKey="roles.details.description">
            {description}
          </DetailsPanel.Field>
        )}
      </DetailsPanel.Section>

      <DetailsPanel.Section labelKey="roles.details.members" count={members.length}>
        {memberGroups.map(({ labelKey, members: group }) => (
          <DetailsPanel.Subsection key={labelKey} labelKey={labelKey} count={group.length}>
            <DetailsPanel.List>
              {group.map((member) => (
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
    </DetailsPanel>
  );
}
