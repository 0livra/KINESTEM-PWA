import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Application } from 'pixi.js';
import { Check, Home, TriangleAlert, X } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { useMatchStore, useUserStore } from '../../../store';
import { GridMatrix, CELL_SIZE } from '../../../engine/core/grid-matrix';
import { ElectronicComponentNode } from '../../../engine/nodes/ElectronicComponentNode';
import { ComponentVisualState } from '../../../engine/core/circuit-types';
import { ArenaHud } from './arena-hud';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 420;
const ROUND_SECONDS = 15;

export default function ArenaRoute() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const nodeRef = useRef<ElectronicComponentNode | null>(null);
  const navigate = useNavigate();

  const { ronda, vidasRestantes, decrementLives, advanceRound } = useMatchStore((s) => ({
    ronda: s.ronda,
    vidasRestantes: s.vidasRestantes,
    decrementLives: s.decrementLives,
    advanceRound: s.advanceRound,
  }));

  const { updateSaldo } = useUserStore((s) => ({
    updateSaldo: s.updateSaldo,
  }));

  const [timerSeconds, setTimerSeconds] = useState(ROUND_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [ronda]);

  useEffect(() => {
    let isDestroyed = false;
    const canvasContainer = containerRef.current;
    if (!canvasContainer) return;

    const app = new Application();
    appRef.current = app;

    const initPixi = async () => {
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0f172a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (isDestroyed) {
        app.destroy(true);
        return;
      }

      canvasContainer.appendChild(app.canvas);

      // Instanciación de matriz lógica y nodo de componente electrónico
      const matrix = new GridMatrix(8, 10, CELL_SIZE);
      const resistorNode = new ElectronicComponentNode({
        type: 'resistor',
        col: 3,
        row: 4,
        cellSize: CELL_SIZE,
        matrix,
      });

      // Listener interactivo en el nodo del contenedor ancla
      resistorNode.on('pointerdown', () => {
        resistorNode.setState('success');
        updateSaldo(25);
      });

      nodeRef.current = resistorNode;
      app.stage.addChild(resistorNode);
    };

    void initPixi();

    return () => {
      isDestroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [updateSaldo]);

  const handleTriggerState = useCallback(
    (state: ComponentVisualState) => {
      if (nodeRef.current) {
        nodeRef.current.setState(state);
      }
      if (state === 'fail') {
        decrementLives();
        setTimerSeconds(ROUND_SECONDS);
      } else if (state === 'success') {
        updateSaldo(50);
        advanceRound();
        setTimerSeconds(ROUND_SECONDS);
      }
    },
    [advanceRound, decrementLives, updateSaldo]
  );

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
          vidas={vidasRestantes}
          timerSeconds={timerSeconds}
          maxTimerSeconds={ROUND_SECONDS}
          stemConcept="Ley de Ohm (Resistencias)"
          challengeInstruction="Conecta la resistencia adecuada"
        />

        {/* Lienzo WebGL Pixi.js: circuito de 60 FPS */}
        <div
          ref={containerRef}
          className="mx-auto mt-4 w-full overflow-hidden rounded-2xl border-4 border-ink shadow-[5px_5px_0px_rgba(15,23,42,0.6)] [&>canvas]:h-auto [&>canvas]:w-full"
          style={{ maxWidth: `${CANVAS_WIDTH}px` }}
          aria-label="Lienzo de circuito interactivo"
        />

        {/* Controles de verificación de estados (whiteboxing) */}
        <div className="mt-5 rounded-2xl border-4 border-ink bg-slate-800 p-4 shadow-[5px_5px_0px_#0F172A]">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Simular estado del contenedor ancla
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ArcadeButton variant="green" icon={Check} onClick={() => handleTriggerState('success')}>
              Exito (+50)
            </ArcadeButton>
            <ArcadeButton variant="red" icon={X} onClick={() => handleTriggerState('fail')}>
              Fallo (-1 vida)
            </ArcadeButton>
            <ArcadeButton variant="yellow" icon={TriangleAlert} onClick={() => handleTriggerState('warning')}>
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
