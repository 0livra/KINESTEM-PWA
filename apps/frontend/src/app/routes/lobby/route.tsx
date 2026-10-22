import { useEffect } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Info, Play, Users } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { ChipMascot } from '../../components/led-mascot';
import { useAppStore, useMatchStore, useUserStore } from '../../../store';
import { PlayerCard } from './lobby-components';
import type { ParticipantItem } from './lobby-components';
import { sendFaceCommand, sendLcdCommand, sendStationMode, subscribeHardwareEvents } from '../../hardware/gateway-client';

const SURVIVAL_LIVES = 3;

async function fetchJsonOrNull(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function matchIdOf(match: Record<string, unknown> | null): number {
  return Number(match?.['match_id'] ?? match?.['id'] ?? 0);
}

/**
 * Partida de la sala: la del store (vinculación) si sigue abierta; si no, la activa
 * del backend o una nueva. Sin backend se juega en local con la partida del store.
 */
async function resolveLobbyMatch(): Promise<Record<string, unknown> | null> {
  const storeMatchId = useAppStore.getState().matchId;
  if (storeMatchId) {
    const current = (await fetchJsonOrNull(`/api/v1/matches/${storeMatchId}`))?.['data'] as Record<string, unknown> | undefined;
    if (current && current['estado'] !== 'finalizada') return current;
  }
  const active = (await fetchJsonOrNull('/api/v1/matches/active'))?.['data'] as Record<string, unknown> | undefined;
  const base =
    active ??
    ((await fetchJsonOrNull('/api/v1/matches', { method: 'POST' }))?.['data'] as Record<string, unknown> | undefined);
  if (!base) return null;
  const withParticipants = (await fetchJsonOrNull(`/api/v1/matches/${matchIdOf(base)}`))?.['data'];
  return (withParticipants as Record<string, unknown> | undefined) ?? base;
}

export async function clientLoader() {
  const [match, statusRes] = await Promise.all([
    resolveLobbyMatch(),
    fetchJsonOrNull('/api/v1/health').then((r) => r ?? { status: 'offline' }),
  ]);

  const s = useAppStore.getState();
  const matchId = matchIdOf(match) || s.matchId || 0;
  const rawParticipants = Array.isArray(match?.['participantes'])
    ? (match['participantes'] as Record<string, unknown>[])
    : [];

  const players: ParticipantItem[] = rawParticipants.map((p, idx) => ({
    id: Number(p['user_id'] ?? idx + 1),
    username: String(p['username'] ?? `Jugador ${idx + 1}`),
    rfidUid: typeof p['rfid_uid'] === 'string' ? p['rfid_uid'] : null,
    vidas: SURVIVAL_LIVES,
    ready: true,
  }));
  // Jugador local siempre visible aunque el backend no lo tenga admitido
  if (s.username && !players.some((p) => p.id === s.userId || (s.rfidUid && p.rfidUid === s.rfidUid))) {
    players.unshift({ id: s.userId ?? 0, username: s.username, rfidUid: s.rfidUid, vidas: SURVIVAL_LIVES, ready: true });
  }

  return {
    matchId,
    codigoSala: String(
      match?.['codigo_sala'] ?? s.codigoSala ?? (matchId ? `KINE-${String(matchId).padStart(3, '0')}` : 'LOCAL-DEMO')
    ),
    vidasIniciales: SURVIVAL_LIVES,
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

  useEffect(() => {
    sendStationMode('GAME');
    sendLcdCommand('SALA DE ESPERA', 'PULSA PARA JUGAR');
    sendFaceCommand('happy');

    const unsubscribe = subscribeHardwareEvents((event, eventData) => {
      if (event === 'BTN:GREEN' || (event === 'IR_DIGIT' && String(eventData) === '5')) {
        handleStartArena();
      }
    });
    return () => {
      unsubscribe();
      sendStationMode('IDLE');
    };
  }, [data.codigoSala]);

  const handleStartArena = () => {
    sendLcdCommand('PARTIDA INICIADA', 'A JUGAR!');
    sendFaceCommand('cheer');
    setMatch({
      matchId: data.matchId || null,
      codigoSala: data.codigoSala,
      estadoPartida: 'in_progress',
      ronda: 1,
      vidasRestantes: data.vidasIniciales,
      eliminado: false,
      puntuacion: 0,
    });
    // Solo las partidas 'creada' pueden iniciarse; si ya está en curso el backend responde 400
    if (data.matchId) {
      void fetch(`/api/v1/matches/${data.matchId}/start`, { method: 'POST' }).catch(() => null);
    }
    navigate('/arena');
  };

  const handleBack = () => {
    disconnectCurrentUser();
    sendLcdCommand('EN ESPERA', 'CONECTA LA WEB');
    sendFaceCommand('waiting');
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
            {data.players.length === 0 ? (
              <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-300">
                Sin jugadores vinculados: puedes jugar en modo local
              </p>
            ) : null}
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
