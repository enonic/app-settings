import { Button } from '@enonic/ui';
import { CircleUserRound, UserPen, UserShield, Users } from 'lucide-react';

import { type IdProvider, principalName } from '../../entities/principal';
import { useI18n } from '../../shared/i18n';
import { filledSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type IdProviderDetailsProps = {
  provider: IdProvider;
};

export function IdProviderDetails({ provider }: IdProviderDetailsProps) {
  const t = useI18n();
  const { key, displayName, description, idProviderConfig, users, groups, roles } = provider;

  // Users and groups belong to the provider; the roles are the ones its principals hold.
  const sections = filledSections([
    { labelKey: 'idProviders.details.users', icon: CircleUserRound, items: users },
    { labelKey: 'idProviders.details.groups', icon: Users, items: groups },
    { labelKey: 'idProviders.details.roles', icon: UserPen, items: roles },
  ]);

  return (
    <DetailsPanel>
      <DetailsPanel.Header
        icon={<UserShield size={48} strokeWidth={1.5} aria-hidden />}
        title={displayName}
        subtitle={key}
      />

      <DetailsPanel.Section
        labelKey="idProviders.details.info"
        action={
          // TODO: [#4] Opens the provider wizard once it exists.
          <Button variant="outline" size="sm" label={t('idProviders.details.edit')} />
        }
      >
        {description !== undefined && (
          <DetailsPanel.Field labelKey="idProviders.details.description">
            {description}
          </DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="idProviders.details.application">
          {idProviderConfig?.applicationKey ?? t('idProviders.details.noApplication')}
        </DetailsPanel.Field>
      </DetailsPanel.Section>

      {sections.map(({ labelKey, icon: Icon, items }) => (
        <DetailsPanel.Section key={labelKey} labelKey={labelKey} count={items.length}>
          <DetailsPanel.List>
            {items.map((principal) => (
              <DetailsPanel.ListItem
                key={principal.key}
                icon={<Icon size={24} strokeWidth={1.5} aria-hidden />}
                title={principal.displayName}
                subtitle={principalName(principal.key)}
              />
            ))}
          </DetailsPanel.List>
        </DetailsPanel.Section>
      ))}
    </DetailsPanel>
  );
}
