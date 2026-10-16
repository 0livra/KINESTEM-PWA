import { useLoaderData, useNavigate } from 'react-router';
import { PlayerCard, ParticipantItem } from './lobby-components';
import { useMatchStore } from '../../../store';

export async function clientLoader() {
  // Carga concurrente con Promise.all para erradicar cascadas de red (waterfalls)
  const [matchConfigRes, activePlayersRes] = await Promise.all([
    fetch('/api/v1/matches/1').then((r) => r.json()).catch(() => ({
      data: { match: { id: 1, codigo_sala: 'KINE-STEM-01', ronda_actual: 1, vidas_iniciales: 3 } },
    })),
    fetch('/api/v1/status').then((r) => r.json()).catch(() => ({ status: 'running' })),
  ]);

  const defaultPlayers: ParticipantItem[] = [
    { id: 1, username: 'Player Alpha', avatarUrl: '', vidas: 3, ready: true },
    { id: 2, username: 'Player Beta', avatarUrl: '', vidas: 3, ready: true },
    { id: 3, username: 'Player Gamma', avatarUrl: '', vidas: 2, ready: false },
  ];

  return {
    matchConfig: matchConfigRes.data?.match || { codigo_sala: 'KINE-001', vidas_iniciales: 3 },
    systemStatus: activePlayersRes,
    players: defaultPlayers,
  };
}

export default function LobbyRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();
  const { setMatch } = useMatchStore((s) => ({ setMatch: s.setMatch }));

  const handleStartArena = () => {
    setMatch({
      matchId: 1,
      codigoSala: data.matchConfig.codigo_sala,
      estadoPartida: 'in_progress',
      ronda: 1,
      vidasRestantes: 3,
      eliminado: false,
    });
    navigate('/arena');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Sala de Espera (Lobby)</h2>
          <p style={{ color: '#94A3B8', margin: '0.25rem 0 0 0' }}>
            Código de Sala: <strong style={{ color: '#38BDF8' }}>{data.matchConfig.codigo_sala}</strong>
          </p>
        </div>
        <button
          onClick={handleStartArena}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Iniciar Partida en Arena ⚔️
        </button>
      </div>

      <h3 style={{ color: '#E2E8F0', marginBottom: '1rem' }}>Estudiantes en la partida</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {data.players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#1E293B', borderRadius: '8px' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
          💡 Cada participante inicia con <strong>{data.matchConfig.vidas_iniciales} vidas</strong>. Si fallas un componente de circuito o se agota el tiempo límite de la ronda, perderás 1 vida.
        </p>
      </div>
    </div>
  );
}
