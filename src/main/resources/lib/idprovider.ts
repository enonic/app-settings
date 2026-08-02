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
    'com.enonic.app.settings.lib.idprovider.GetIdProviderDescriptorHandler',
  );
  bean.setApplication(params.application);
  return __.toNativeObject(bean.execute());
}
