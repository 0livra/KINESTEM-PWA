import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Delete, Nfc, Radio, ScanLine } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { useHardwareStore, useMatchStore, useUserStore } from '../../../store';
import {
  announcePinAcceptedToGateway,
  registerNewUser,
  sendFaceCommand,
  sendGatewayCommand,
  sendLcdCommand,
  subscribeHardwareEvents,
  syncMatchParticipants,
} from '../../hardware/gateway-client';
import type { SavedProfile } from '../../../store/user.slice';
import {
  DuplicateRfidBanner,
  IrPulseLed,
  IrVerdictFeedback,
  LcdMock,
  LedMatrixFaceMock,
  NewUserForm,
  PairedStatePanel,
  PhaseStepper,
  PinDigitTiles,
  ProfilePicker,
  RfidScanVisual,
} from './pairing-components';

export async function clientLoader() {
  const [statusRes, gatewayPingRes] = await Promise.all([
    fetch('/api/v1/health').then((r) => r.json()).catch(() => ({ status: 'offline' })),
    fetch('/ping').then((r) => r.json()).catch(() => ({ status: 'offline' })),
  ]);
  return { systemStatus: statusRes, gatewayPing: gatewayPingRes };
}

type GateStep = 'CHOOSER' | 'NEW_USER' | 'SESSION';

export default function AuthPairingRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const { userId, username, saldoPuntos, rfidUid, isPaired, savedProfiles, setUser, adoptSavedProfile, disconnectCurrentUser } =
    useUserStore((s) => ({
      userId: s.userId,
      username: s.username,
      saldoPuntos: s.saldoPuntos,
      rfidUid: s.rfidUid,
      isPaired: s.isPaired,
      savedProfiles: s.savedProfiles,
      setUser: s.setUser,
      adoptSavedProfile: s.adoptSavedProfile,
      disconnectCurrentUser: s.disconnectCurrentUser,
    }));

  const {
    pairingPhase,
    pairingPin,
    irDigits,
    irPulseAt,
    irAttempts,
    duplicateRfidError,
    lcdMessage,
    ledMatrixFace,
    wsStatus,
    connected,
    startPairingSession,
    beginRfidScanPhase,
    retryIrCode,
    resetPairing,
  } = useHardwareStore((s) => ({
    pairingPhase: s.pairingPhase,
    pairingPin: s.pairingPin,
    irDigits: s.irDigits,
    irPulseAt: s.irPulseAt,
    irAttempts: s.irAttempts,
    duplicateRfidError: s.duplicateRfidError,
    lcdMessage: s.lcdMessage,
    ledMatrixFace: s.ledMatrixFace,
    wsStatus: s.wsStatus,
    connected: s.connected,
    startPairingSession: s.startPairingSession,
    beginRfidScanPhase: s.beginRfidScanPhase,
    retryIrCode: s.retryIrCode,
    resetPairing: s.resetPairing,
  }));

  const { matchId, setMatch } = useMatchStore((s) => ({
    matchId: s.matchId,
    setMatch: s.setMatch,
  }));

  const [gateStep, setGateStep] = useState<GateStep>(savedProfiles.length > 0 ? 'CHOOSER' : 'NEW_USER');
  const [loadingPin, setLoadingPin] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gateStep !== 'SESSION') return;
    let cancelled = false;
    const syncMatch = async () => {
      if (matchId) return;
      const active = await fetch('/api/v1/matches/active').then((r) => r.json()).catch(() => null);
      let match = active?.data ?? null;
      if (!match) {
        const created = await fetch('/api/v1/matches', { method: 'POST' }).then((r) => r.json()).catch(() => null);
        match = created?.data ?? null;
      }
      if (!cancelled && match?.id) {
        setMatch({ matchId: match.id, codigoSala: match.codigo_sala ?? 'LOCAL-DEMO', estadoPartida: 'lobby' });
        syncMatchParticipants(match);
      }
    };
    void syncMatch();
    return () => {
      cancelled = true;
    };
  }, [gateStep, matchId, setMatch]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const handleGeneratePin = useCallback(async () => {
    setLoadingPin(true);
    try {
      const body = userId ? JSON.stringify({ userId }) : '{}';
      const res = await fetch('/api/v1/auth/pairing/generate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const json = await res.json();
      const pin: string | undefined = json?.data?.pin ?? json?.pin;
      const finalPin = pin ?? Math.floor(1000 + Math.random() * 9000).toString();
      setUser({ pinTemporal: finalPin });
      startPairingSession(finalPin);
      sendGatewayCommand({ type: 'SUBMIT_PIN', pin: finalPin });
    } catch {
      const mockPin = Math.floor(1000 + Math.random() * 9000).toString();
      setUser({ pinTemporal: mockPin });
      startPairingSession(mockPin);
      sendGatewayCommand({ type: 'SUBMIT_PIN', pin: mockPin });
    } finally {
      setLoadingPin(false);
    }
  }, [setUser, startPairingSession, userId]);

  const handleCreateProfile = useCallback(
    async (newUsername: string, newAvatarId: string) => {
      await registerNewUser(newUsername, newAvatarId);
      setGateStep('SESSION');
    },
    []
  );

  const handleAdoptProfile = useCallback(
    (profile: SavedProfile) => {
      adoptSavedProfile(profile);
      setGateStep('SESSION');
    },
    [adoptSavedProfile]
  );

  const handleDisconnect = useCallback(() => {
    disconnectCurrentUser();
    resetPairing();
    setGateStep('CHOOSER');
    sendLcdCommand('EN ESPERA', 'CONECTA LA WEB');
    sendFaceCommand('waiting');
  }, [disconnectCurrentUser, resetPairing]);

  useEffect(() => {
    if (pairingPhase === 'IR_CODE_CORRECT') {
      announcePinAcceptedToGateway();
      sendLcdCommand('CODIGO CORRECTO', 'ESPERA RFID...');
      sendFaceCommand('happy');
      advanceTimer.current = setTimeout(() => beginRfidScanPhase(), 1500);
    } else if (pairingPhase === 'WAITING_RFID_SCAN') {
      sendLcdCommand('APROXIMA TARJETA', 'LECTOR RC522');
      sendFaceCommand('waiting');
    } else if (pairingPhase === 'RFID_DUPLICATED') {
      sendLcdCommand('TARJETA YA EN', 'PARTIDA ACTIVA');
      sendFaceCommand('error');
    } else if (pairingPhase === 'PAIRING_COMPLETE') {
      sendLcdCommand('INGRESO CORRECTO', 'A JUGAR!');
      sendFaceCommand('cheer');
      if (rfidUid) {
        advanceTimer.current = setTimeout(() => navigate('/lobby'), 2200);
      }
    }
    return () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };
  }, [pairingPhase, beginRfidScanPhase, navigate, rfidUid]);

  useEffect(() => {
    const unsubscribe = subscribeHardwareEvents((event) => {
      if (event === 'BTN:GREEN') {
        if (!pairingPin && !loadingPin && pairingPhase === 'IDLE' && gateStep === 'SESSION') {
          void handleGeneratePin();
        } else if (pairingPhase === 'IR_CODE_INCORRECT') {
          retryIrCode();
          if (pairingPin) sendGatewayCommand({ type: 'SUBMIT_PIN', pin: pairingPin });
        }
      } else if (event === 'BTN:RED') {
        if (pairingPhase === 'IR_CODE_INCORRECT') {
          retryIrCode();
          if (pairingPin) sendGatewayCommand({ type: 'SUBMIT_PIN', pin: pairingPin });
        }
      }
    });
    return unsubscribe;
  }, [gateStep, handleGeneratePin, loadingPin, pairingPhase, pairingPin, retryIrCode]);

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
        <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border-4 border-ink bg-slate-800 p-4 shadow-[5px_5px_0px_#0F172A]">
          <div className="min-w-0 flex-1">
            <LcdMock message={lcdMessage} />
            <div className="mt-2 flex items-center gap-3">
              <IrPulseLed pulseAt={irPulseAt} />
              <span
                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${wsStatus === 'connected' ? 'text-arcade-emerald' : 'text-slate-400'
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-arcade-emerald' : 'bg-slate-600'
                    }`}
                  aria-hidden
                />
                Gateway {wsStatus === 'connected' ? (connected ? 'Serial OK' : 'en linea') : 'sin senal'}
              </span>
            </div>
          </div>
          <LedMatrixFaceMock face={ledMatrixFace} />
        </div>

        {isPaired ? (
          <PairedStatePanel username={username} rfidUid={rfidUid} onDisconnect={handleDisconnect} />
        ) : null}

        {!isPaired && gateStep === 'CHOOSER' && savedProfiles.length > 0 ? (
          <ProfilePicker
            profiles={savedProfiles}
            onAdopt={handleAdoptProfile}
            onNewProfile={() => setGateStep('NEW_USER')}
          />
        ) : null}

        {!isPaired && (gateStep === 'NEW_USER' || (gateStep === 'CHOOSER' && savedProfiles.length === 0)) ? (
          <NewUserForm onCreate={handleCreateProfile} busy={false} defaultUsername={username ?? ''} />
        ) : null}

        {!isPaired && gateStep === 'SESSION' ? (
          <>
            <PhaseStepper phase={pairingPhase} />

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
                    <ArcadeButton
                      variant="dark"
                      size="md"
                      icon={Delete}
                      block
                      className="mt-3"
                      onClick={() => {
                        retryIrCode();
                        if (pairingPin) sendGatewayCommand({ type: 'SUBMIT_PIN', pin: pairingPin });
                      }}
                    >
                      Borrar e intentar de nuevo
                    </ArcadeButton>
                  </>
                ) : null}
              </PanelCard>
            ) : null}

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

                {duplicateRfidError ? (
                  <DuplicateRfidBanner message={duplicateRfidError} onRetry={() => beginRfidScanPhase()} />
                ) : null}
              </PanelCard>
            ) : null}

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

            {!pairingPin && !loadingPin && pairingPhase === 'IDLE' ? (
              <PanelCard tone="ink" title="Estado del Gateway" className="animate-pop-in">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Servidor: {String(data.systemStatus?.status ?? 'en linea')} · Ping:{' '}
                  {String(data.gatewayPing?.status ?? 'OK')}
                </p>
                {username ? (
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-arcade-emerald">
                    Perfil: {username} · {saldoPuntos} pts
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
          </>
        ) : null}
      </main>
    </div>
  );
}