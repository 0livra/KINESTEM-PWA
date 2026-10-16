export interface ConceptMetric {
  concept: string;
  scorePct: number;
}

export function StemRadarMock({ metrics }: { metrics: ConceptMetric[] }) {
  return (
    <div style={{ backgroundColor: '#0F172A', padding: '1.25rem', borderRadius: 8, border: '1px solid #334155' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#38BDF8' }}>Dominio de Conceptos STEM (Radar)</h4>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {metrics.map((m, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <span>{m.concept}</span>
              <span style={{ fontWeight: 'bold', color: m.scorePct >= 70 ? '#34D399' : '#F59E0B' }}>
                {m.scorePct}%
              </span>
            </div>
            <div style={{ height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${m.scorePct}%`,
                  height: '100%',
                  backgroundColor: m.scorePct >= 70 ? '#10B981' : '#F59E0B',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MortalityTimeline({ rounds }: { rounds: { round: number; eliminatedCount: number }[] }) {
  return (
    <div style={{ backgroundColor: '#0F172A', padding: '1.25rem', borderRadius: 8, border: '1px solid #334155' }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#EF4444' }}>Línea de Mortalidad por Ronda</h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: '1rem', paddingBottom: '0.5rem' }}>
        {rounds.map((r) => {
          const barHeight = Math.max(15, r.eliminatedCount * 30);
          return (
            <div key={r.round} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                {r.eliminatedCount} elim.
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${barHeight}px`,
                  backgroundColor: '#EF4444',
                  borderRadius: '4px 4px 0 0',
                }}
              />
              <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748B' }}>
                R{r.round}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
