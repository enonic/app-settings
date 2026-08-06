/**
 * The id provider descriptor no XP JS lib exposes.
 *
 * `lib/xp/auth` reaches id provider *instances* — `getIdProviders()` — but nothing about the
 * descriptor an application declares in `idprovider/idprovider.yaml`. That needs
 * `IdProviderDescriptorService`, an OSGi service.
 */

export type IdProviderDescriptor = {
  /** Absent when the descriptor declares no `mode:`. The builder has no default. */
  mode?: string;
  /** Whether the descriptor declares a config form. The form itself is not carried — see #64. */
  hasConfig: boolean;
};

export type GetIdProviderDescriptorParams = {
  application: string;
};

type GetIdProviderDescriptorHandler = {
  setApplication(value: string): void;
  execute(): IdProviderDescriptor | null;
};

/** Null when the application ships no descriptor, i.e. when it is not an id provider at all. */
export function getIdProviderDescriptor(
  params: GetIdProviderDescriptorParams,
): IdProviderDescriptor | null {
  const bean = __.newBean<GetIdProviderDescriptorHandler>(
    'com.enonic.xp.app.settings.lib.idprovider.GetIdProviderDescriptorHandler',
  );
  bean.setApplication(params.application);
  return __.toNativeObject(bean.execute());
}

/** A principal that may reach a provider, and how far. XP's `IdProviderAccess`. */
export type IdProviderAccess =
  | 'READ'
  | 'CREATE_USERS'
  | 'WRITE_USERS'
  | 'ID_PROVIDER_MANAGER'
  | 'ADMINISTRATOR';

export type IdProviderPermission = {
  principal: {
    key: string;
    type: string;
    displayName: string;
  };
  access?: IdProviderAccess;
};

type GetIdProviderPermissionsHandler = {
  setIdProviderKey(value: string): void;
  execute(): IdProviderPermission[] | null;
};

/** Null when no provider answers to the key. `lib/xp/auth` exposes none of this. */
export function getIdProviderPermissions(params: {
  idProvider: string;
}): IdProviderPermission[] | null {
  const bean = __.newBean<GetIdProviderPermissionsHandler>(
    'com.enonic.xp.app.settings.lib.idprovider.GetIdProviderPermissionsHandler',
  );
  bean.setIdProviderKey(params.idProvider);
  return __.toNativeObject(bean.execute());
}

type DefaultIdProviderPermissionsHandler = {
  execute(): IdProviderPermission[];
};

/**
 * What a new provider starts from. XP declares no default, so this is app-users' own list: administrators
 * and the user manager as ADMINISTRATOR, everyone authenticated as READ.
 */
export function defaultIdProviderPermissions(): IdProviderPermission[] {
  const bean = __.newBean<DefaultIdProviderPermissionsHandler>(
    'com.enonic.xp.app.settings.lib.idprovider.DefaultIdProviderPermissionsHandler',
  );
  return __.toNativeObject(bean.execute());
}
