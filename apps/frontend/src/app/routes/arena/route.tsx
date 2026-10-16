import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { ArenaHud } from './arena-hud';
import { useMatchStore, useUserStore } from '../../../store';
import { GridMatrix, CELL_SIZE } from '../../../engine/core/grid-matrix';
import { ElectronicComponentNode } from '../../../engine/nodes/ElectronicComponentNode';
import { ComponentVisualState } from '../../../engine/core/circuit-types';

export default function ArenaRoute() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const nodeRef = useRef<ElectronicComponentNode | null>(null);

  const { ronda, vidasRestantes, decrementLives, advanceRound } = useMatchStore((s) => ({
    ronda: s.ronda,
    vidasRestantes: s.vidasRestantes,
    decrementLives: s.decrementLives,
    advanceRound: s.advanceRound,
  }));

  const { updateSaldo } = useUserStore((s) => ({
    updateSaldo: s.updateSaldo,
  }));

  const [timerSeconds] = useState(15);

  useEffect(() => {
    let isDestroyed = false;
    const canvasContainer = containerRef.current;
    if (!canvasContainer) return;

    const app = new Application();
    appRef.current = app;

    const initPixi = async () => {
      await app.init({
        width: 800,
        height: 480,
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
      const matrix = new GridMatrix(10, 6, CELL_SIZE);
      const resistorNode = new ElectronicComponentNode({
        type: 'resistor',
        col: 4,
        row: 2,
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

    initPixi();

    return () => {
      isDestroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [updateSaldo]);

  const handleTriggerState = (state: ComponentVisualState) => {
    if (nodeRef.current) {
      nodeRef.current.setState(state);
    }
    if (state === 'fail') {
      decrementLives();
    } else if (state === 'success') {
      updateSaldo(50);
      advanceRound();
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <ArenaHud
        ronda={ronda}
        vidas={vidasRestantes}
        timerSeconds={timerSeconds}
        maxTimerSeconds={15}
        stemConcept="Ley de Ohm (Resistencias)"
        challengeInstruction="Conecta la resistencia adecuada para proteger el circuito contra sobrecarga."
      />

      {/* Contenedor del Lienzo WebGL Pixi.js */}
      <div
        ref={containerRef}
        style={{
          width: 800,
          height: 480,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          border: '2px solid #334155',
          margin: '0 auto',
        }}
      />

      {/* Controles de verificación de Whiteboxing & Estados */}
      <div
        style={{
          marginTop: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: '#1E293B',
          borderRadius: 8,
        }}
      >
        <span style={{ alignSelf: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
          Simular Estado del Contenedor Ancla:
        </span>
        <button
          onClick={() => handleTriggerState('idle')}
          style={{ padding: '0.5rem 1rem', background: '#64748B', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Idle
        </button>
        <button
          onClick={() => handleTriggerState('warning')}
          style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Warning
        </button>
        <button
          onClick={() => handleTriggerState('success')}
          style={{ padding: '0.5rem 1rem', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Success (+50 pts)
        </button>
        <button
          onClick={() => handleTriggerState('fail')}
          style={{ padding: '0.5rem 1rem', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Fail (-1 vida)
        </button>
      </div>
    </div>
  );
}
