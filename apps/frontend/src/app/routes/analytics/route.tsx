import { useLoaderData } from 'react-router';
import { StemRadarMock, MortalityTimeline, ConceptMetric } from './charts-components';

export async function clientLoader() {
  // Evitar cascadas de red cargando telemetría y resumen analítico concurrentemente con Promise.all
  const [analyticsRes, historyRes] = await Promise.all([
    fetch('/api/v1/telemetry/analytics').then((r) => r.json()).catch(() => ({
      data: {
        total_intentos: 48,
        tasa_exito_pct: 78,
        tiempo_reaccion_promedio_ms: 640,
        distribucion_errores: { EXITO: 37, ERROR_COMPONENTE: 8, TIMEOUT: 3 },
      },
    })),
    fetch('/api/v1/telemetry/history?limit=10').then((r) => r.json()).catch(() => ({ data: [] })),
  ]);

  const mockRadarMetrics: ConceptMetric[] = [
    { concept: 'Ley de Ohm', scorePct: 85 },
    { concept: 'Capacitancia & Filtros', scorePct: 62 },
    { concept: 'Sensores LDR / Luz', scorePct: 90 },
    { concept: 'Diodos y Polaridad', scorePct: 74 },
    { concept: 'Continuidad de Pista', scorePct: 95 },
  ];

  const mockMortalityRounds = [
    { round: 1, eliminatedCount: 0 },
    { round: 2, eliminatedCount: 1 },
    { round: 3, eliminatedCount: 3 },
    { round: 4, eliminatedCount: 2 },
  ];

  return {
    analytics: analyticsRes.data,
    history: historyRes.data || [],
    radarMetrics: mockRadarMetrics,
    mortalityRounds: mockMortalityRounds,
  };
}

export default function AnalyticsRoute() {
  const data = useLoaderData<typeof clientLoader>();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Dashboard Analítico Post-Partida</h2>
        <p style={{ color: '#94A3B8' }}>
          Métricas de desempeño cognitivo STEM, precisión de componentes y curva de dificultad.
        </p>
      </div>

      {/* Tarjetas de Métricas de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', backgroundColor: '#1E293B', borderRadius: 10, border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Tasa de Éxito Global</span>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#10B981' }}>
            {data.analytics?.tasa_exito_pct ?? 78}%
          </h3>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#1E293B', borderRadius: 10, border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Tiempo de Reacción Promedio</span>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#38BDF8' }}>
            {data.analytics?.tiempo_reaccion_promedio_ms ?? 640} ms
          </h3>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#1E293B', borderRadius: 10, border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Total de Desafíos Jugados</span>
          <h3 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#F59E0B' }}>
            {data.analytics?.total_intentos ?? 48}
          </h3>
        </div>
      </div>

      {/* Gráficos de Radar y Mortalidad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <StemRadarMock metrics={data.radarMetrics} />
        <MortalityTimeline rounds={data.mortalityRounds} />
      </div>
    </div>
  );
}
