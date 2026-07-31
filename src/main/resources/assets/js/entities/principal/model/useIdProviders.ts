import { useStore } from '@nanostores/preact';
import { useEffect } from 'preact/hooks';

import { $idProviders, type IdProvidersState, loadIdProviders } from './id-providers.store';

export function useIdProviders(): IdProvidersState {
  const state = useStore($idProviders);

  useEffect(() => {
    void loadIdProviders();
  }, []);

  return state;
}
