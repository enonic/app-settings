import { CircleUserRound, UserPen, Users } from 'lucide-react';

import { ItemLabel } from '../../../shared/ui/ItemLabel';
import { principalName } from '../model/principal.keys';
import type { PrincipalRef, PrincipalType } from '../model/principal.types';

export type PrincipalLabelProps = {
  principal: PrincipalRef;
  className?: string;
};

export function PrincipalLabel({ principal, className }: PrincipalLabelProps) {
  const { key, type, displayName } = principal;

  return (
    <ItemLabel
      className={className}
      icon={icon(type)}
      primary={displayName}
      secondary={principalName(key)}
    />
  );
}

function icon(type: PrincipalType) {
  if (type === 'group') {
    return <Users size={24} strokeWidth={1.5} aria-hidden />;
  }

  if (type === 'role') {
    return <UserPen size={24} strokeWidth={1.5} aria-hidden />;
  }

  return <CircleUserRound size={24} strokeWidth={1.5} aria-hidden />;
}
