import { LivesIndicator } from '../lobby/lobby-components';

export interface ArenaHudProps {
  ronda: number;
  vidas: number;
  timerSeconds: number;
  maxTimerSeconds: number;
  stemConcept: string;
  challengeInstruction: string;
}

export function ArenaHud({
  ronda,
  vidas,
  timerSeconds,
  maxTimerSeconds,
  stemConcept,
  challengeInstruction,
}: ArenaHudProps) {
  const progressPct = Math.max(0, Math.min(100, (timerSeconds / maxTimerSeconds) * 100));
  const isUrgent = progressPct <= 30;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: '#1E293B',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase' }}>
            Ronda {ronda} • Concepto: <strong style={{ color: '#38BDF8' }}>{stemConcept}</strong>
          </span>
          <h3 style={{ margin: '0.25rem 0 0 0', color: '#F8FAFC' }}>{challengeInstruction}</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <LivesIndicator lives={vidas} />
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: isUrgent ? '#EF4444' : '#F59E0B' }}>
            ⏱️ {timerSeconds}s
          </div>
        </div>
      </div>

      {/* Barra de progreso de tiempo restante */}
      <div style={{ width: '100%', height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            backgroundColor: isUrgent ? '#EF4444' : '#10B981',
            transition: 'width 1s linear, background-color 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
