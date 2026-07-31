import { Button } from '@enonic/ui';
import { CircleUserRound, UserPen, Users } from 'lucide-react';

import { idProviderOf, principalName, type User } from '../../entities/principal';
import { formatDateTime } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { filledSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type UserDetailsProps = {
  user: User;
};

export function UserDetails({ user }: UserDetailsProps) {
  const t = useI18n();
  const { key, displayName, login, description, email, createdTime, modifiedTime, roles, groups } =
    user;

  const timestamps = [createdTime, modifiedTime]
    .filter((value): value is string => value !== undefined)
    .map((value) => formatDateTime(value))
    .join(' / ');

  const memberships = filledSections([
    { labelKey: 'users.details.roles', icon: UserPen, items: roles, provenance: false },
    { labelKey: 'users.details.groups', icon: Users, items: groups, provenance: true },
  ]);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<CircleUserRound size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={login}
      />

      <DetailsPanel.Section
        labelKey="users.details.user"
        action={
          // TODO: [#7] Opens the user wizard once it exists.
          <Button variant="outline" size="sm" label={t('users.details.edit')} />
        }
      >
        {description !== undefined && (
          <DetailsPanel.Field labelKey="users.details.description">
            {description}
          </DetailsPanel.Field>
        )}
        {email !== undefined && (
          <DetailsPanel.Field labelKey="users.details.email">{email}</DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="users.details.idProvider">
          {idProviderOf(key)}
        </DetailsPanel.Field>
        {timestamps.length > 0 && (
          <DetailsPanel.Field labelKey="users.details.timestamps">{timestamps}</DetailsPanel.Field>
        )}
      </DetailsPanel.Section>

      {memberships.map(({ labelKey, icon: Icon, items, provenance }) => (
        <DetailsPanel.Section key={labelKey} labelKey={labelKey} count={items.length}>
          <DetailsPanel.List>
            {items.map((principal) => (
              <DetailsPanel.ListItem
                key={principal.key}
                icon={<Icon size={24} strokeWidth={1.5} aria-hidden />}
                title={principal.displayName}
                subtitle={principalName(principal.key)}
                // A role belongs to no provider, so only a group carries one.
                meta={provenance ? idProviderOf(principal.key) : undefined}
              />
            ))}
          </DetailsPanel.List>
        </DetailsPanel.Section>
      ))}
    </DetailsPanel>
  );
}
