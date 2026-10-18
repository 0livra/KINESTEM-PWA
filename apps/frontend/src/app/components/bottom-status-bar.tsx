import { Link } from 'react-router';
import { Gamepad2, Coins, Radio, ScanLine, Monitor } from 'lucide-react';
import { useUserStore, useHardwareStore } from '../../store';

/**
 * Barra de navegación inferior fija, optimizada para el pulgar:
 * indicadores de conexión del Arduino (IR / RFID / LCD) y saldo de
 * puntos actual del jugador. Anclaje con safe-area-inset-bottom.
 */
export function BottomStatusBar() {
  const { saldoPuntos, username } = useUserStore((s) => ({
    saldoPuntos: s.saldoPuntos,
    username: s.username,
  }));

  const { wsStatus, connected, mock, irPulseAt, pairingPhase, linked } = useHardwareStore((s) => ({
    wsStatus: s.wsStatus,
    connected: s.connected,
    mock: s.mock,
    irPulseAt: s.irPulseAt,
    pairingPhase: s.pairingPhase,
    linked: s.linked,
  }));

  const irActive = irPulseAt !== null && Date.now() - irPulseAt < 2500;
  const rfidScanning = pairingPhase === 'WAITING_RFID_SCAN';
  const linkLive = linked || wsStatus === 'connected';

  return (
    <nav
      aria-label="Estado de la consola"
      className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-ink bg-ink pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-1 px-3">
        <Link
          to="/"
          aria-label="Ir al menu principal"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-slate-600 bg-arcade-navy text-arcade-yellow transition-all duration-100 active:translate-y-[2px]"
        >
          <Gamepad2 className="h-5 w-5" aria-hidden />
        </Link>

        {/* Indicadores de hardware de la estación */}
        <div className="flex min-w-0 items-center gap-2.5" aria-label="Indicadores de hardware">
          <HardwarePill icon={Radio} label="IR" active={irActive} tone="blue" blink={irActive} />
          <HardwarePill icon={ScanLine} label="RFID" active={rfidScanning || linkLive} tone="amber" blink={rfidScanning} />
          <HardwarePill icon={Monitor} label="LCD" active={connected || linkLive} tone="green" />
        </div>

        {/* Saldo de puntos */}
        <div
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border-[3px] border-arcade-yellow bg-ink px-2.5"
          title={username ? `Sesion: ${username}` : 'Sin sesion activa'}
        >
          <Coins className="h-4 w-4 text-arcade-yellow" aria-hidden />
          <span className="font-display text-sm font-extrabold tabular-nums text-arcade-yellow">
            {saldoPuntos}
          </span>
          <span className="hidden text-[10px] font-bold uppercase text-slate-400 sm:inline">
            {mock ? 'MOCK' : 'PTS'}
          </span>
        </div>
      </div>
    </nav>
  );
}

function HardwarePill({
  icon: Icon,
  label,
  active,
  tone,
  blink,
}: {
  icon: typeof Radio;
  label: string;
  active: boolean;
  tone: 'blue' | 'amber' | 'green';
  blink?: boolean;
}) {
  const dotTone =
    tone === 'blue'
      ? 'bg-arcade-sky-deep'
      : tone === 'amber'
        ? 'bg-arcade-amber'
        : 'bg-arcade-emerald';
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${active ? 'activo' : 'inactivo'}`}>
      <Icon
        className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-600'} ${blink ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      <span className="flex items-center gap-1">
        <span
          className={`h-1.5 w-1.5 rounded-full ${active ? dotTone : 'bg-slate-700'} ${blink ? 'animate-pulse' : ''}`}
          aria-hidden
        />
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </span>
    </div>
  );
}
