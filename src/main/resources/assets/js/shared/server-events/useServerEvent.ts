import { useEffect } from 'preact/hooks';

import { onServerEvent, type ServerEventListener } from './server-events';

export function useServerEvent(listener: ServerEventListener): void {
  useEffect(() => onServerEvent(listener), [listener]);
}
