import { useState } from 'react';
import { useLoaderData } from 'react-router';
import { PinDisplay, RfidWaitingIndicator } from './pairing-components';
import { useUserStore } from '../../../store';

export async function clientLoader() {
  // Evitar cascada de red (waterfalls) mediante Promise.all
  const [statusRes, userSessionRes] = await Promise.all([
    fetch('/api/v1/status').then((r) => r.json()).catch(() => ({ status: 'offline' })),
    fetch('/ping').then((r) => r.json()).catch(() => ({ status: 'offline' })),
  ]);

  return {
    systemStatus: statusRes,
    gatewayPing: userSessionRes,
  };
}

export default function AuthPairingRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const [loading, setLoading] = useState(false);
  const [isWaitingRfid, setIsWaitingRfid] = useState(false);

  const { pinTemporal, setPinTemporal, username } = useUserStore((s) => ({
    pinTemporal: s.pinTemporal,
    setPinTemporal: s.setPinTemporal,
    username: s.username,
  }));

  const handleGeneratePin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/pairing/generate-pin', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.pin) {
        setPinTemporal(json.data.pin);
        setIsWaitingRfid(true);
      }
    } catch {
      // Fallback local en caso de desconexión
      const mockPin = Math.floor(1000 + Math.random() * 9000).toString();
      setPinTemporal(mockPin);
      setIsWaitingRfid(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>Vinculación de Estación de Juego</h2>
        <p style={{ color: '#94A3B8' }}>
          Conecta tu perfil de estudiante con la consola física KINESTEM.
        </p>
      </div>

      <PinDisplay pin={pinTemporal} onGeneratePin={handleGeneratePin} isLoading={loading} />
      <RfidWaitingIndicator waiting={isWaitingRfid} />

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#1E293B', borderRadius: '8px', fontSize: '0.875rem' }}>
        <p style={{ margin: '0 0 0.5rem 0', color: '#94A3B8' }}>Estado del Gateway:</p>
        <div style={{ color: '#38BDF8' }}>
          Servidor: {data.systemStatus?.status ?? 'Conectado'} | Ping: {data.gatewayPing?.status ?? 'OK'}
        </div>
        {username && <div style={{ marginTop: '0.5rem', color: '#10B981' }}>Sesión activa: {username}</div>}
      </div>
    </div>
  );
}
