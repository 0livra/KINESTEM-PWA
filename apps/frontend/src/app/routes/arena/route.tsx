import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Application } from 'pixi.js';
import { Check, Home, RotateCcw, Skull, TriangleAlert, Users, X } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { useAppStore, useMatchStore, useUserStore } from '../../../store';
import { GridMatrix, CELL_SIZE } from '../../../engine/core/grid-matrix';
import { ElectronicComponentNode } from '../../../engine/nodes/ElectronicComponentNode';
import { ComponentVisualState } from '../../../engine/core/circuit-types';
import { ArenaHud } from './arena-hud';
import {
  sendFaceCommand,
  sendLcdCommand,
  sendRgbCommand,
  sendStationMode,
  subscribeHardwareEvents,
} from '../../hardware/gateway-client';

/** El firmware reporta cualquier tecla del control como `IR:5` (MODE:GAME): confirma el circuito. */
const IR_CONFIRM_KEY = '5';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 420;
const ROUND_SECONDS = 15;
const MAX_LIVES = 3;
const POINTS_PER_ROUND = 50;
const FEEDBACK_MS = 1200;

type RoundOutcome = ComponentVisualState | 'timeout';

export default function ArenaRoute() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRef = useRef<ElectronicComponentNode | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const { matchId, ronda, vidasRestantes, puntuacion, decrementLives, advanceRound, setMatch } = useMatchStore((s) => ({
    matchId: s.matchId,
    ronda: s.ronda,
    vidasRestantes: s.vidasRestantes,
    puntuacion: s.puntuacion,
    decrementLives: s.decrementLives,
    advanceRound: s.advanceRound,
    setMatch: s.setMatch,
  }));

  const { updateSaldo } = useUserStore((s) => ({ updateSaldo: s.updateSaldo }));

  const [timerSeconds, setTimerSeconds] = useState(ROUND_SECONDS);
  const [canvasError, setCanvasError] = useState(false);

  const gameOver = vidasRestantes <= 0;
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;

  const resetSurvival = useCallback(() => {
    setMatch({
      ronda: 1,
      vidasRestantes: MAX_LIVES,
      eliminado: false,
      puntuacion: 0,
      estadoPartida: 'in_progress',
    });
    setTimerSeconds(ROUND_SECONDS);
    nodeRef.current?.setState('idle');
    sendLcdCommand('RONDA 1', `VIDAS: ${MAX_LIVES}`);
    sendFaceCommand('waiting');
    sendRgbCommand(0, 0, 0);
  }, [setMatch]);

  // Partida previa terminada (o entrada directa a /arena): arranca una supervivencia nueva
  useEffect(() => {
    if (useAppStore.getState().vidasRestantes <= 0) resetSurvival();
    sendStationMode('GAME');
    sendFaceCommand('waiting');
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      sendStationMode('IDLE');
      sendRgbCommand(0, 0, 0);
    };
  }, [resetSurvival]);

  useEffect(() => {
    if (gameOver) return;
    sendLcdCommand(`RONDA ${ronda}`, `VIDAS: ${vidasRestantes}`);
  }, [gameOver, ronda, vidasRestantes]);

  const showFeedback = useCallback((face: string, rgb: [number, number, number]) => {
    sendFaceCommand(face);
    sendRgbCommand(...rgb);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      nodeRef.current?.setState('idle');
      if (gameOverRef.current) return;
      sendFaceCommand('waiting');
      sendRgbCommand(0, 0, 0);
    }, FEEDBACK_MS);
  }, []);

  const handleRoundOutcome = useCallback(
    (outcome: RoundOutcome) => {
      if (gameOverRef.current) return;
      nodeRef.current?.setState(outcome === 'timeout' ? 'fail' : outcome);

      if (outcome === 'fail' || outcome === 'timeout') {
        decrementLives();
        setTimerSeconds(ROUND_SECONDS);
        sendLcdCommand(outcome === 'timeout' ? 'TIEMPO AGOTADO' : 'ERROR EN CIRCUITO', 'PIERDES 1 VIDA');
        showFeedback('error', [255, 0, 0]);
      } else if (outcome === 'success') {
        updateSaldo(POINTS_PER_ROUND);
        setMatch({ puntuacion: useAppStore.getState().puntuacion + POINTS_PER_ROUND });
        advanceRound();
        setTimerSeconds(ROUND_SECONDS);
        sendLcdCommand('CIRCUITO OK', `+${POINTS_PER_ROUND} PUNTOS`);
        showFeedback('happy', [0, 255, 0]);
      } else if (outcome === 'warning') {
        showFeedback('confused', [255, 255, 0]);
      }
    },
    [advanceRound, decrementLives, setMatch, showFeedback, updateSaldo]
  );

  const outcomeRef = useRef(handleRoundOutcome);
  outcomeRef.current = handleRoundOutcome;

  // Cuenta regresiva de la ronda (se detiene en game over)
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, ronda]);

  useEffect(() => {
    if (timerSeconds === 0) outcomeRef.current('timeout');
  }, [timerSeconds]);

  // Fin de la supervivencia: hardware + cierre de partida en el backend (best-effort)
  useEffect(() => {
    // Al montar con una partida ya terminada, resetSurvival() corre antes y deja vidas > 0
    if (!gameOver || useAppStore.getState().vidasRestantes > 0) return;
    setMatch({ estadoPartida: 'finished', eliminado: true });
    sendLcdCommand('FIN DEL JUEGO', `RONDA ${ronda}`);
    sendFaceCommand('error');
    sendRgbCommand(255, 0, 0);
    if (matchId) {
      void fetch(`/api/v1/matches/${matchId}/finalize`, { method: 'POST' }).catch(() => null);
    }
    // ronda/matchId se leen en el instante del game over
  }, [gameOver]);

  // Pixi v8: destruir una Application antes de que init() resuelva lanza excepción
  // (doble montaje de StrictMode o salida rápida), por eso se difiere al .then().
  useEffect(() => {
    const canvasContainer = containerRef.current;
    if (!canvasContainer) return;

    let disposed = false;
    let initialized = false;
    const app = new Application();

    app
      .init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0f172a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        initialized = true;
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        canvasContainer.appendChild(app.canvas);

        const matrix = new GridMatrix(8, 10, CELL_SIZE);
        const resistorNode = new ElectronicComponentNode({
          type: 'resistor',
          col: 3,
          row: 4,
          cellSize: CELL_SIZE,
          matrix,
        });
        resistorNode.on('pointerdown', () => outcomeRef.current('success'));
        nodeRef.current = resistorNode;
        app.stage.addChild(resistorNode);
      })
      .catch((err: unknown) => {
        console.error('[Arena] No se pudo iniciar el lienzo Pixi:', err);
        if (!disposed) setCanvasError(true);
      });

    return () => {
      disposed = true;
      nodeRef.current = null;
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeHardwareEvents((event, data) => {
      const pressedConfirm =
        (event === 'IR_DIGIT' && String(data) === IR_CONFIRM_KEY) || event === 'BTN:GREEN';
      if (gameOverRef.current) {
        if (pressedConfirm) resetSurvival();
        return;
      }
      if (pressedConfirm || event === 'COMPONENT_ATTACHED') {
        outcomeRef.current('success');
      } else if (event === 'BTN:RED') {
        outcomeRef.current('fail');
      }
    });
    return unsubscribe;
  }, [resetSurvival]);

  return (
    <div className="min-h-dvh bg-halftone-ink bg-fixed">
      <ConsoleTopBar
        title="Arena STEM"
        subtitle={`Ronda ${ronda} · Supervivencia`}
        onBack={() => navigate('/')}
        backLabel="Volver"
      />

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-5">
        <ArenaHud
          ronda={ronda}
          vidas={Math.max(0, vidasRestantes)}
          timerSeconds={timerSeconds}
          maxTimerSeconds={ROUND_SECONDS}
          stemConcept="Ley de Ohm (Resistencias)"
          challengeInstruction="Conecta la resistencia adecuada"
        />
        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-widest text-arcade-yellow">
          Puntos de la partida: {puntuacion}
        </p>

        {gameOver ? (
          <PanelCard tone="ink" icon={Skull} title="Fin de la supervivencia" className="mt-4 animate-pop-in">
            <div className="flex flex-col items-center gap-1 py-1 text-center">
              <p className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">Sin vidas</p>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Llegaste a la ronda {ronda} con {puntuacion} puntos
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-arcade-sky">
                Pulsa el control IR o la tecla 5 para jugar de nuevo
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <ArcadeButton variant="green" icon={RotateCcw} block onClick={resetSurvival}>
                Jugar de nuevo
              </ArcadeButton>
              <ArcadeButton variant="dark" icon={Users} block onClick={() => navigate('/lobby')}>
                Volver al lobby
              </ArcadeButton>
            </div>
          </PanelCard>
        ) : null}

        {/* Lienzo WebGL Pixi.js: circuito de 60 FPS */}
        <div
          ref={containerRef}
          className={`mx-auto mt-4 w-full overflow-hidden rounded-2xl border-4 border-ink shadow-[5px_5px_0px_rgba(15,23,42,0.6)] [&>canvas]:h-auto [&>canvas]:w-full ${
            gameOver ? 'pointer-events-none opacity-40' : ''
          }`}
          style={{ maxWidth: `${CANVAS_WIDTH}px` }}
          aria-label="Lienzo de circuito interactivo"
        />
        {canvasError ? (
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            El lienzo grafico no esta disponible; usa los botones de abajo o el control IR
          </p>
        ) : null}

        <div className="mt-5 rounded-2xl border-4 border-ink bg-slate-800 p-4 shadow-[5px_5px_0px_#0F172A]">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Simular estado del contenedor ancla
          </p>
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-arcade-sky">
            Cualquier boton del control IR o la tecla 5 confirma el circuito (+{POINTS_PER_ROUND})
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ArcadeButton variant="green" icon={Check} disabled={gameOver} onClick={() => handleRoundOutcome('success')}>
              Exito (+{POINTS_PER_ROUND})
            </ArcadeButton>
            <ArcadeButton variant="red" icon={X} disabled={gameOver} onClick={() => handleRoundOutcome('fail')}>
              Fallo (-1 vida)
            </ArcadeButton>
            <ArcadeButton
              variant="yellow"
              icon={TriangleAlert}
              disabled={gameOver}
              onClick={() => handleRoundOutcome('warning')}
            >
              Advertencia
            </ArcadeButton>
            <ArcadeButton variant="dark" icon={Home} onClick={() => navigate('/')}>
              Al menu
            </ArcadeButton>
          </div>
        </div>
      </main>
    </div>
  );
}
