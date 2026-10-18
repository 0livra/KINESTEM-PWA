import { useLoaderData, useNavigate } from 'react-router';
import { BarChart3, Gauge, Target, Timer } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { PanelCard } from '../../components/panel-card';
import { StemRadarMock, MortalityTimeline } from './charts-components';

export interface ConceptMetric {
  concept: string;
  scorePct: number;
}

export async function clientLoader() {
  // Telemetría y resumen analítico cargados concurrentemente (sin cascadas)
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

  const radarMetrics: ConceptMetric[] = [
    { concept: 'Ley de Ohm', scorePct: 85 },
    { concept: 'Capacitancia y Filtros', scorePct: 62 },
    { concept: 'Sensores LDR / Luz', scorePct: 90 },
    { concept: 'Diodos y Polaridad', scorePct: 74 },
    { concept: 'Continuidad de Pista', scorePct: 95 },
  ];

  const mortalityRounds = [
    { round: 1, eliminatedCount: 0 },
    { round: 2, eliminatedCount: 1 },
    { round: 3, eliminatedCount: 3 },
    { round: 4, eliminatedCount: 2 },
  ];

  return {
    analytics: analyticsRes.data,
    history: historyRes.data ?? [],
    radarMetrics,
    mortalityRounds,
  };
}

export default function AnalyticsRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();

  const summaryCards = [
    {
      label: 'Tasa de Exito Global',
      value: `${data.analytics?.tasa_exito_pct ?? 78}%`,
      icon: Target,
      tone: 'bg-arcade-emerald text-ink',
    },
    {
      label: 'Reaccion Promedio',
      value: `${data.analytics?.tiempo_reaccion_promedio_ms ?? 640} ms`,
      icon: Timer,
      tone: 'bg-arcade-sky text-ink',
    },
    {
      label: 'Desafios Jugados',
      value: `${data.analytics?.total_intentos ?? 48}`,
      icon: Gauge,
      tone: 'bg-arcade-amber text-ink',
    },
  ];

  return (
    <div className="min-h-dvh bg-halftone-navy bg-fixed">
      <ConsoleTopBar
        title="Resultados"
        subtitle="Telemetria y Estadisticas"
        onBack={() => navigate('/')}
        backLabel="Volver"
      />

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        {/* Resumen de métricas (post-partida) */}
        <div className="grid grid-cols-3 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border-[3px] border-ink p-2.5 text-center shadow-[3px_3px_0px_#0F172A] ${card.tone}`}
            >
              <card.icon className="mx-auto h-5 w-5" aria-hidden />
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums leading-none">{card.value}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase leading-tight tracking-wider opacity-80">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Gráficos de dominio y mortalidad */}
        <div className="mt-5 grid gap-5">
          <StemRadarMock metrics={data.radarMetrics} />
          <MortalityTimeline rounds={data.mortalityRounds} />
        </div>

        {/* Distribución de resultados */}
        <PanelCard tone="navy" icon={BarChart3} title="Distribucion de Resultados" className="mt-5 animate-pop-in">
          <div className="grid gap-2.5">
            {(
              [
                { key: 'EXITO', label: 'Exitos', tone: 'bg-arcade-emerald' },
                { key: 'ERROR_COMPONENTE', label: 'Error de componente', tone: 'bg-arcade-red' },
                { key: 'TIMEOUT', label: 'Tiempo agotado', tone: 'bg-arcade-amber' },
              ] as const
            ).map((row) => {
              const distribution = (data.analytics?.distribucion_errores ?? {}) as Record<string, number>;
              const count = distribution[row.key] ?? 0;
              const total = Math.max(1, Object.values(distribution).reduce((a, b) => a + Number(b), 0));
              const pct = Math.round((count / total) * 100);
              return (
                <div key={row.key}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full border-2 border-slate-700 bg-slate-900">
                    <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </main>
    </div>
  );
}
