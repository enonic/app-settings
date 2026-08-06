import { Button } from '@enonic/ui';
import { CircleUserRound, UserShield, Users } from 'lucide-react';

import { type IdProvider, principalName } from '../../entities/principal';
import { openIdProviderEditor } from '../../features/idprovider-editor';
import { useI18n } from '../../shared/i18n';
import { countedSections } from '../../widgets/details-panel/details-panel';
import { DetailsPanel } from '../../widgets/details-panel/DetailsPanel';

export type IdProviderDetailsProps = {
  provider: IdProvider;
};

export function IdProviderDetails({ provider }: IdProviderDetailsProps) {
  const editLabel = useI18n('idProviders.details.edit');
  const noApplicationLabel = useI18n('idProviders.details.noApplication');

  const { key, displayName, description, application, users, groups } = provider;

  // Counted, not enumerated: a section appears because the provider holds principals, and its rows
  // arrive only if something asked for them. A provider may hold a whole directory, so the list
  // query takes the totals alone — see #23.
  const sections = countedSections([
    { labelKey: 'idProviders.details.users', icon: CircleUserRound, set: users },
    { labelKey: 'idProviders.details.groups', icon: Users, set: groups },
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
          <Button
            variant="outline"
            size="sm"
            label={editLabel}
            onClick={() => openIdProviderEditor(provider)}
          />
        }
      >
        {description !== undefined && (
          <DetailsPanel.Field labelKey="idProviders.details.description">
            {description}
          </DetailsPanel.Field>
        )}
        <DetailsPanel.Field labelKey="idProviders.details.application">
          {application?.displayName ?? noApplicationLabel}
        </DetailsPanel.Field>
      </DetailsPanel.Section>

      {sections.map(({ labelKey, icon: Icon, set }) => (
        <DetailsPanel.Section key={labelKey} labelKey={labelKey} count={set.total}>
          {/* Absent rows are "not fetched", not "none", so the heading and its count stand alone
              rather than over an empty list. */}
          {set.items !== undefined && (
            <DetailsPanel.List>
              {set.items.map((principal) => (
                <DetailsPanel.ListItem
                  key={principal.key}
                  icon={<Icon size={24} strokeWidth={1.5} aria-hidden />}
                  title={principal.displayName}
                  subtitle={principalName(principal.key)}
                />
              ))}
            </DetailsPanel.List>
          )}
        </DetailsPanel.Section>
      ))}
    </DetailsPanel>
  );
}
