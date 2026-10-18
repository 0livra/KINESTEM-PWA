import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Delete, Gamepad2, Nfc, Radio, ScanLine } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { useHardwareStore, useMatchStore, useUserStore } from '../../../store';
import {
  announcePinAcceptedToGateway,
  simulateIrKey,
  simulateRfidScan,
  syncMatchParticipants,
} from '../../hardware/gateway-client';
import {
  DuplicateRfidBanner,
  IrPulseLed,
  IrVerdictFeedback,
  LcdMock,
  LedMatrixFaceMock,
  PhaseStepper,
  PinDigitTiles,
  RfidScanVisual,
} from './pairing-components';

export async function clientLoader() {
  const [statusRes, gatewayPingRes] = await Promise.all([
    fetch('/api/v1/health').then((r) => r.json()).catch(() => ({ status: 'offline' })),
    fetch('/ping').then((r) => r.json()).catch(() => ({ status: 'offline' })),
  ]);
  return { systemStatus: statusRes, gatewayPing: gatewayPingRes };
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const DEMO_RFID_CARDS = ['UID_8F3A21', 'UID_55B7C0', 'UID_A1D94E'];

export default function AuthPairingRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const { setPinTemporal, username, userId, setUser } = useUserStore((s) => ({
    setPinTemporal: s.setPinTemporal,
    username: s.username,
    userId: s.userId,
    setUser: s.setUser,
  }));

  const {
    pairingPhase,
    pairingPin,
    irDigits,
    irPulseAt,
    irAttempts,
    rfidUid,
    duplicateRfidError,
    lcdMessage,
    ledMatrixFace,
    wsStatus,
    connected,
    startPairingSession,
    beginRfidScanPhase,
    retryIrCode,
  } = useHardwareStore((s) => ({
    pairingPhase: s.pairingPhase,
    pairingPin: s.pairingPin,
    irDigits: s.irDigits,
    irPulseAt: s.irPulseAt,
    irAttempts: s.irAttempts,
    rfidUid: s.rfidUid,
    duplicateRfidError: s.duplicateRfidError,
    lcdMessage: s.lcdMessage,
    ledMatrixFace: s.ledMatrixFace,
    wsStatus: s.wsStatus,
    connected: s.connected,
    startPairingSession: s.startPairingSession,
    beginRfidScanPhase: s.beginRfidScanPhase,
    retryIrCode: s.retryIrCode,
  }));

  const { matchId, setMatch } = useMatchStore((s) => ({
    matchId: s.matchId,
    setMatch: s.setMatch,
  }));

  const [loadingPin, setLoadingPin] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sincroniza participantes de la partida activa (anti-duplicados RFID) */
  useEffect(() => {
    let cancelled = false;
    const syncParticipants = async () => {
      if (matchId) {
        const res = await fetch(`/api/v1/matches/${matchId}`)
          .then((r) => r.json())
          .catch(() => null);
        if (!cancelled && res?.data) syncMatchParticipants(res.data);
        return;
      }
      // Sin partida activa: crea una de demostración para la sala
      const created = await fetch('/api/v1/matches', { method: 'POST' })
        .then((r) => r.json())
        .catch(() => null);
      if (!cancelled && created?.data?.id) {
        setMatch({ matchId: created.data.id, codigoSala: created.data.codigo_sala, estadoPartida: 'lobby' });
        syncMatchParticipants(created.data);
      }
    };
    void syncParticipants();
    return () => {
      cancelled = true;
    };
  }, [matchId, setMatch]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  /* Genera el PIN y abre la FASE 1 (nunca salta directo a RFID) */
  const handleGeneratePin = useCallback(async () => {
    setLoadingPin(true);
    try {
      const res = await fetch('/api/v1/auth/pairing/generate-pin', { method: 'POST' });
      const json = await res.json();
      const pin: string | undefined = json?.data?.pin ?? json?.pin;
      const finalPin = pin ?? Math.floor(1000 + Math.random() * 9000).toString();
      setPinTemporal(finalPin);
      startPairingSession(finalPin);
    } catch {
      const mockPin = Math.floor(1000 + Math.random() * 9000).toString();
      setPinTemporal(mockPin);
      startPairingSession(mockPin);
    } finally {
      setLoadingPin(false);
    }
  }, [setPinTemporal, startPairingSession]);

  /* "Código correcto": confirma al gateway y avanza a la FASE 2 */
  useEffect(() => {
    if (pairingPhase === 'IR_CODE_CORRECT') {
      announcePinAcceptedToGateway();
      advanceTimer.current = setTimeout(() => beginRfidScanPhase(), 1500);
    }
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [pairingPhase, beginRfidScanPhase]);

  /* "Ingreso correcto": vincula perfil y transiciona al Lobby */
  useEffect(() => {
    if (pairingPhase === 'PAIRING_COMPLETE' && rfidUid) {
      advanceTimer.current = setTimeout(() => navigate('/lobby'), 2200);
    }
  }, [pairingPhase, rfidUid, navigate, username, userId, setUser]);

  const phase1Active = pairingPhase === 'WAITING_IR_CODE' || pairingPhase === 'IR_CODE_INCORRECT';
  const phase2Active = pairingPhase === 'WAITING_RFID_SCAN' || pairingPhase === 'RFID_DUPLICATED';
  const pairingDone = pairingPhase === 'PAIRING_COMPLETE';

  return (
    <div className="min-h-dvh bg-halftone-ink bg-fixed">
      <ConsoleTopBar
        title="Vinculacion"
        subtitle="Estacion de Juego Fisica"
        onBack={() => navigate('/')}
        backLabel="Volver"
      />

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        {/* Espejo de la consola física: LCD 16x2 I2C + Matriz LED 8x8 */}
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border-4 border-ink bg-slate-800 p-4 shadow-[5px_5px_0px_#0F172A]">
          <div className="min-w-0 flex-1">
            <LcdMock message={lcdMessage} />
            <div className="mt-2 flex items-center gap-3">
              <IrPulseLed pulseAt={irPulseAt} />
              <span
                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                  wsStatus === 'connected' ? 'text-arcade-emerald' : 'text-slate-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    wsStatus === 'connected' ? 'bg-arcade-emerald' : 'bg-slate-600'
                  }`}
                  aria-hidden
                />
                Gateway {wsStatus === 'connected' ? (connected ? 'Serial OK' : 'en linea') : 'sin senal'}
              </span>
            </div>
          </div>
          <LedMatrixFaceMock face={ledMatrixFace} />
        </div>

        <PhaseStepper phase={pairingPhase} />

        {/* ------------------------------------------------ */}
        {/* FASE 1: PIN via Control Remoto IR                 */}
        {/* ------------------------------------------------ */}
        {phase1Active ? (
          <PanelCard tone="yellow" icon={Radio} title="Fase 1 · Codigo IR" className="animate-pop-in">
            <p className="text-center font-display text-sm font-extrabold uppercase leading-snug tracking-wide">
              Ingresa el codigo con el Control IR apuntando a la consola
            </p>

            <div className="mt-4">
              <PinDigitTiles pin={pairingPin} tone="lcd" />
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-ink/70">
                PIN de sesion (mostrado en la LCD 16x2)
              </p>
            </div>

            <div className="mt-4 rounded-xl border-[3px] border-ink bg-ink/90 p-3">
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-arcade-sky">
                Digitos capturados por el sensor IR
              </p>
              <PinDigitTiles pin={irDigits.join('')} tone="ir" />
            </div>

            {pairingPhase === 'IR_CODE_INCORRECT' ? (
              <>
                <IrVerdictFeedback status="incorrect" />
                <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-wider text-ink/80">
                  Intento fallido numero {irAttempts}
                </p>
                <ArcadeButton variant="dark" size="md" icon={Delete} block className="mt-3" onClick={retryIrCode}>
                  Borrar e intentar de nuevo
                </ArcadeButton>
              </>
            ) : null}

            {/* Teclado de demostracion: simula pulsos del Control IR */}
            <div className="mt-4 rounded-xl border-[3px] border-ink bg-ink/90 p-3">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-arcade-yellow">
                <Gamepad2 className="h-4 w-4" aria-hidden />
                Teclado IR de demostracion
              </p>
              <div className="grid grid-cols-5 gap-2">
                {KEYPAD_DIGITS.map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => simulateIrKey(digit)}
                    aria-label={`Pulso IR digito ${digit}`}
                    className="flex h-11 min-w-[44px] items-center justify-center rounded-lg border-2 border-arcade-sky-deep bg-arcade-navy font-display text-lg font-extrabold text-white shadow-[2px_2px_0px_#0F172A] transition-all duration-100 active:translate-y-[2px] active:shadow-none"
                  >
                    {digit}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Sin Arduino: usa este teclado · Con hardware: apunta el Control IR
              </p>
            </div>
          </PanelCard>
        ) : null}

        {/* ------------------------------------------------ */}
        {/* FASE 2: Escaneo RFID (solo tras "Codigo correcto") */}
        {/* ------------------------------------------------ */}
        {pairingPhase === 'IR_CODE_CORRECT' ? (
          <div className="animate-pop-in">
            <IrVerdictFeedback status="correct" />
          </div>
        ) : null}

        {phase2Active ? (
          <PanelCard tone="sky" icon={ScanLine} title="Fase 2 · Tarjeta RFID" className="animate-pop-in">
            <p className="text-center font-display text-sm font-extrabold uppercase leading-snug tracking-wide">
              Acerca tu tarjeta o llavero RFID al lector RC522
            </p>

            <div className="mt-4">
              <RfidScanVisual scanning={pairingPhase === 'WAITING_RFID_SCAN'} />
            </div>

            {pairingPhase === 'WAITING_RFID_SCAN' ? (
              <div className="mt-4 rounded-xl border-[3px] border-ink bg-ink/90 p-3">
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-arcade-yellow">
                  <Nfc className="h-4 w-4" aria-hidden />
                  Lector de demostracion
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_RFID_CARDS.map((uid) => (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => simulateRfidScan(uid)}
                      aria-label={`Escanear tarjeta de demostracion ${uid}`}
                      className="flex min-h-[44px] flex-col items-center justify-center rounded-lg border-2 border-arcade-amber bg-arcade-navy px-1 py-1.5 font-mono text-[10px] font-bold text-white shadow-[2px_2px_0px_#0F172A] transition-all duration-100 active:translate-y-[2px] active:shadow-none"
                    >
                      <span className="mb-0.5 h-1.5 w-8 rounded-full bg-arcade-amber/70" aria-hidden />
                      {uid}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Tarjetas de prueba · Cada perfil usa su propia credencial fisica
                </p>
              </div>
            ) : null}

            {duplicateRfidError ? (
              <DuplicateRfidBanner
                message={duplicateRfidError}
                onRetry={() => beginRfidScanPhase()}
              />
            ) : null}
          </PanelCard>
        ) : null}

        {/* ------------------------------------------------ */}
        {/* Vinculacion completada                            */}
        {/* ------------------------------------------------ */}
        {pairingDone ? (
          <PanelCard tone="green" icon={Nfc} title="Ingreso correcto" className="animate-pop-in">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <p className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink">
                Ingreso correcto
              </p>
              <p className="text-sm font-bold uppercase tracking-wider text-ink/80">
                Tarjeta {rfidUid} vinculada a {username ?? 'tu perfil'}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink/60">
                Transfiriendo al Lobby...
              </p>
            </div>
          </PanelCard>
        ) : null}

        {/* Estado del gateway y arranque de sesion */}
        {!pairingPin && !loadingPin ? (
          <PanelCard tone="ink" title="Estado del Gateway" className="animate-pop-in">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Servidor: {String(data.systemStatus?.status ?? 'en linea')} · Ping:{' '}
              {String(data.gatewayPing?.status ?? 'OK')}
            </p>
            {username ? (
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-arcade-emerald">
                Sesion activa: {username}
              </p>
            ) : null}
            <ArcadeButton variant="magenta" size="lg" icon={Radio} block className="mt-4" onClick={handleGeneratePin}>
              Iniciar vinculacion (generar PIN)
            </ArcadeButton>
          </PanelCard>
        ) : null}

        {loadingPin ? (
          <p className="mt-4 text-center font-display text-sm font-extrabold uppercase tracking-widest text-arcade-yellow">
            Generando PIN seguro...
          </p>
        ) : null}
      </main>
    </div>
  );
}
