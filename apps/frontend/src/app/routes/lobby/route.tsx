import { useLoaderData, useNavigate } from 'react-router';
import { Info, Play, Users } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { ChipMascot } from '../../components/led-mascot';
import { useMatchStore, useUserStore } from '../../../store';
import { PlayerCard } from './lobby-components';
import type { ParticipantItem } from './lobby-components';

export async function clientLoader() {
  // Carga concurrente de la partida y el estado del gateway (sin cascadas)
  const [matchConfigRes, statusRes] = await Promise.all([
    fetch('/api/v1/matches/1').then((r) => r.json()).catch(() => ({
      data: { id: 1, codigo_sala: 'KINE-STEM-01', ronda_actual: 1, vidas_iniciales: 3 },
    })),
    fetch('/api/v1/health').then((r) => r.json()).catch(() => ({ status: 'offline' })),
  ]);

  const matchData = (matchConfigRes.data as Record<string, unknown>) ?? {};
  const rawParticipants = Array.isArray(matchData['participantes'])
    ? (matchData['participantes'] as Record<string, unknown>[])
    : [];

  const defaultPlayers: ParticipantItem[] = [
    { id: 1, username: 'Estudiante Alpha', rfidUid: 'UID_8F3A21', vidas: 3, ready: true },
    { id: 2, username: 'Estudiante Beta', rfidUid: 'UID_55B7C0', vidas: 3, ready: true },
  ];

  const players: ParticipantItem[] =
    rawParticipants.length > 0
      ? rawParticipants.map((p, idx) => ({
          id: Number(p['user_id'] ?? idx + 1),
          username: String(p['username'] ?? `Jugador ${idx + 1}`),
          rfidUid: typeof p['rfid_uid'] === 'string' ? p['rfid_uid'] : null,
          vidas: Number(p['vidas_restantes'] ?? 3),
          ready: true,
        }))
      : defaultPlayers;

  return {
    matchId: Number(matchData['id'] ?? 1),
    codigoSala: String(matchData['codigo_sala'] ?? 'KINE-STEM-01'),
    vidasIniciales: Number(matchData['vidas_iniciales'] ?? 3),
    systemStatus: statusRes,
    players,
  };
}

export default function LobbyRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();
  const { setMatch } = useMatchStore((s) => ({ setMatch: s.setMatch }));
  const { isPaired, avatarId, disconnectCurrentUser } = useUserStore((s) => ({
    isPaired: s.isPaired,
    avatarId: s.avatarId,
    disconnectCurrentUser: s.disconnectCurrentUser,
  }));

  const handleStartArena = () => {
    setMatch({
      matchId: data.matchId,
      codigoSala: data.codigoSala,
      estadoPartida: 'in_progress',
      ronda: 1,
      vidasRestantes: data.vidasIniciales,
      eliminado: false,
    });
    navigate('/arena');
  };

  const handleBack = () => {
    disconnectCurrentUser();
    navigate('/standby');
  };

  // Mapeo de avatarId a color y expresión
  const getAvatarProps = (id: string) => {
    const colorMap: Record<string, 'red' | 'green' | 'blue' | 'orange' | 'cream'> = {
      led_red_happy: 'red',
      led_blue_happy: 'blue',
      led_green_happy: 'green',
      led_yellow_happy: 'orange',
      led_pink_happy: 'cream',
    };
    return {
      color: colorMap[id] || 'red',
      expression: 'smile' as const,
    };
  };

  const avatarProps = getAvatarProps(avatarId);

  return (
    <div className="min-h-dvh bg-halftone-navy bg-fixed">
      <ConsoleTopBar
        title={isPaired ? '' : 'Lobby'}
        subtitle={isPaired ? '' : `Sala ${data.codigoSala}`}
        onBack={handleBack}
        backLabel="Salir"
        avatarColor={avatarProps.color}
        avatarExpression={avatarProps.expression}
        showUserAvatar={isPaired}
      />

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        {/* Cabecera de sala */}
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border-4 border-ink bg-arcade-navy-deep p-4 shadow-[5px_5px_0px_#0F172A]">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-arcade-sky">Codigo de sala</p>
            <h2 className="panel-title-extrusion truncate font-display text-2xl font-extrabold uppercase tracking-wide text-white">
              {data.codigoSala}
            </h2>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Gateway: {String(data.systemStatus?.status ?? 'en linea')}
            </p>
          </div>
          <ChipMascot face="happy" className="h-16 w-16 shrink-0 animate-float" />
        </div>

        {/* Accion principal para el pulgar */}
        <ArcadeButton variant="green" size="lg" icon={Play} block className="mb-6" onClick={handleStartArena}>
          Iniciar partida en Arena
        </ArcadeButton>

        {/* Participantes */}
        <PanelCard tone="ink" icon={Users} title="Estudiantes en la partida" className="animate-pop-in">
          <div className="grid gap-3">
            {data.players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </PanelCard>

        {/* Reglas de supervivencia */}
        <PanelCard tone="sky" icon={Info} title="Reglas de la Arena" className="mt-5 animate-pop-in">
          <ul className="grid gap-1.5 text-xs font-bold leading-relaxed text-ink">
            <li>Cada participante inicia con {data.vidasIniciales} vidas.</li>
            <li>Fallar un componente de circuito cuesta 1 vida.</li>
            <li>Agotar el tiempo limite de la ronda cuesta 1 vida.</li>
            <li>La ultima consola en pie gana el botin de puntos.</li>
          </ul>
        </PanelCard>
      </main>
    </div>
  );
}
