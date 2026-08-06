import { Button } from '@enonic/ui';
import { CircleUserRound, UserPen, Users } from 'lucide-react';

import { principalName, useIdProviderName, type UserDetail } from '../../entities/principal';
import { openUserEditor } from '../../features/user-editor';
import { useI18n } from '../../shared/i18n';
import { filledSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type UserDetailsProps = {
  user: UserDetail;
};

export function UserDetails({ user }: UserDetailsProps) {
  const providerName = useIdProviderName();

  const editLabel = useI18n('users.details.edit');

  const { key, displayName, login, email, roles, groups } = user;

  // ! No description and no created/modified pair, though the mockups draw both: XP stores neither for a
  // ! user — see the `disabled` and `modifiedTime` entries in `docs/platform-facts.md`.
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
          <Button
            variant="outline"
            size="sm"
            label={editLabel}
            onClick={() => openUserEditor(user)}
          />
        }
      >
        {email !== undefined && (
          <DetailsPanel.Field labelKey="users.details.email">{email}</DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="users.details.idProvider">
          {providerName(key)}
        </DetailsPanel.Field>
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
                meta={provenance ? providerName(principal.key) : undefined}
              />
            ))}
          </DetailsPanel.List>
        </DetailsPanel.Section>
      ))}
    </DetailsPanel>
  );
}
