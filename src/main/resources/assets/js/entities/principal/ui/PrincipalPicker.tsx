import { Combobox, GridList, IconButton, Listbox } from '@enonic/ui';
import { X } from 'lucide-react';
import { useId, useState } from 'preact/hooks';

import { i18n, useI18n } from '../../../shared/i18n';
import { FieldLabel } from '../../../shared/ui/FieldLabel';
import type { PrincipalRef, PrincipalType } from '../model/principal.types';
import { usePrincipalSearch } from '../model/usePrincipalSearch';
import { PrincipalLabel } from './PrincipalLabel';

export type PrincipalPickerProps = {
  selected: readonly PrincipalRef[];
  onChange: (next: readonly PrincipalRef[]) => void;
  /** Which kinds of principal this picker offers: members are users and groups, memberships roles. */
  kinds: readonly PrincipalType[];
  /** Omitted where a section header already names the picker. */
  label?: string;
  placeholder: string;
};

const INCOMPLETE_KEYS: Record<PrincipalType, string> = {
  user: 'principal.picker.usersFailed',
  group: 'principal.picker.groupsFailed',
  role: 'principal.picker.rolesFailed',
};

export function PrincipalPicker({
  selected,
  onChange,
  kinds,
  label,
  placeholder,
}: PrincipalPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const labelId = useId();

  const searchingLabel = useI18n('principal.picker.searching');
  const noMatchesLabel = useI18n('principal.picker.noMatches');
  const failedLabel = useI18n('principal.picker.failed');
  const removeLabel = useI18n('principal.picker.remove');

  const { status, principals, incompleteKinds } = usePrincipalSearch(query, open, kinds);

  const picked = new Set(selected.map(({ key }) => key));
  const offered = principals.filter(({ key }) => !picked.has(key));

  const add = (key: string): void => {
    const found = offered.find((candidate) => candidate.key === key);
    if (found === undefined) {
      return;
    }

    onChange([...selected, found]);
    setQuery('');
  };

  const remove = (key: string): void => {
    onChange(selected.filter((member) => member.key !== key));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label !== undefined && <FieldLabel id={labelId} text={label} />}

      <Combobox
        open={open}
        onOpenChange={setOpen}
        value={query}
        onChange={(next) => setQuery(next ?? '')}
        selectionMode="single"
        selection={[]}
        onSelectionChange={([key]) => key !== undefined && add(key)}
        contentType="listbox"
      >
        <Combobox.Content>
          <Combobox.Control>
            <Combobox.Search>
              <Combobox.SearchIcon />
              <Combobox.Input
                aria-label={label === undefined ? placeholder : undefined}
                aria-labelledby={label === undefined ? undefined : labelId}
                placeholder={placeholder}
              />
              <Combobox.Toggle />
            </Combobox.Search>
          </Combobox.Control>

          <Combobox.Popup>
            <Combobox.ListContent className="max-h-60 overflow-y-auto">
              {status === 'error' && (
                <p className="text-error px-2.5 py-1 text-sm">{failedLabel}</p>
              )}

              {status === 'loading' && offered.length === 0 && (
                <p className="text-subtle px-2.5 py-1 text-sm">{searchingLabel}</p>
              )}

              {status === 'ready' && offered.length === 0 && incompleteKinds.length === 0 && (
                <p className="text-subtle px-2.5 py-1 text-sm">{noMatchesLabel}</p>
              )}

              {incompleteKinds.map((kind) => (
                <p key={kind} className="text-error px-2.5 py-1 text-sm">
                  {i18n(INCOMPLETE_KEYS[kind])}
                </p>
              ))}

              {offered.map((principal) => (
                <Listbox.Item key={principal.key} value={principal.key} className="px-2.5 py-1.5">
                  <PrincipalLabel principal={principal} />
                </Listbox.Item>
              ))}
            </Combobox.ListContent>
          </Combobox.Popup>
        </Combobox.Content>
      </Combobox>

      {selected.length > 0 && (
        <GridList className="flex flex-col gap-2.5 rounded-md py-1.5 pr-1 pl-1">
          {selected.map((member) => (
            <GridList.Row key={member.key} id={`${member.key}-picked`} className="gap-2.5 p-1">
              <GridList.Cell interactive={false} className="flex-1 self-stretch">
                <PrincipalLabel className="min-w-0 flex-1" principal={member} />
              </GridList.Cell>

              <GridList.Cell>
                <GridList.Action>
                  <IconButton
                    aria-label={removeLabel}
                    icon={X}
                    variant="text"
                    onClick={() => remove(member.key)}
                  />
                </GridList.Action>
              </GridList.Cell>
            </GridList.Row>
          ))}
        </GridList>
      )}
    </div>
  );
}
