import { useEffect } from 'react';
import { acquireHardwareGateway, releaseHardwareGateway } from '../hardware/gateway-client';

/**
 * Mantiene viva la conexión con el gateway de hardware (WebSocket /ws).
 * Se monta una única vez en el layout raíz de la aplicación.
 */
export function useHardwareGateway(): void {
  useEffect(() => {
    acquireHardwareGateway();
    return () => {
      releaseHardwareGateway();
    };
  }, []);
}
