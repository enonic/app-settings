import { CircleUserRound, KeyRound, type LucideIcon, ShieldUser, Star, Users } from 'lucide-react';

export type SectionId = 'applications' | 'id-providers' | 'roles' | 'groups' | 'users';

export type SectionPath = `/${SectionId}`;

export type Section = {
  id: SectionId;
  path: SectionPath;
  icon: LucideIcon;
  labelKey: string;
  titleKey: string;
};

export const SECTIONS: readonly Section[] = [
  {
    id: 'applications',
    path: '/applications',
    icon: Star,
    labelKey: 'nav.applications',
    titleKey: 'section.applications.title',
  },
  {
    id: 'users',
    path: '/users',
    icon: CircleUserRound,
    labelKey: 'nav.users',
    titleKey: 'section.users.title',
  },
  {
    id: 'groups',
    path: '/groups',
    icon: Users,
    labelKey: 'nav.groups',
    titleKey: 'section.groups.title',
  },
  {
    id: 'roles',
    path: '/roles',
    icon: KeyRound,
    labelKey: 'nav.roles',
    titleKey: 'section.roles.title',
  },
  {
    id: 'id-providers',
    path: '/id-providers',
    icon: ShieldUser,
    labelKey: 'nav.idProviders',
    titleKey: 'section.idProviders.title',
  },
];

export const DEFAULT_SECTION = SECTIONS[0];
