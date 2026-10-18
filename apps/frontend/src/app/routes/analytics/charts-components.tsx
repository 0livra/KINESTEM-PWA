import type { ConceptMetric } from './route';

export function StemRadarMock({ metrics }: { metrics: ConceptMetric[] }) {
  return (
    <div className="rounded-2xl border-4 border-ink bg-ink p-4 shadow-[5px_5px_0px_rgba(15,23,42,0.6)]">
      <h4 className="panel-title-extrusion mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-arcade-sky">
        Dominio de Conceptos STEM
      </h4>
      <div className="grid gap-3">
        {metrics.map((metric, idx) => {
          const strong = metric.scorePct >= 70;
          return (
            <div key={idx}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <span className="min-w-0 truncate">{metric.concept}</span>
                <span className={`tabular-nums ${strong ? 'text-arcade-emerald' : 'text-arcade-amber'}`}>
                  {metric.scorePct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border-2 border-slate-700 bg-slate-900">
                <div
                  className={`h-full rounded-full ${strong ? 'bg-arcade-emerald' : 'bg-arcade-amber'}`}
                  style={{ width: `${metric.scorePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MortalityTimeline({ rounds }: { rounds: { round: number; eliminatedCount: number }[] }) {
  const maxCount = Math.max(1, ...rounds.map((r) => r.eliminatedCount));
  return (
    <div className="rounded-2xl border-4 border-ink bg-ink p-4 shadow-[5px_5px_0px_rgba(15,23,42,0.6)]">
      <h4 className="panel-title-extrusion mb-3 font-display text-sm font-extrabold uppercase tracking-wide text-arcade-red">
        Eliminaciones por Ronda
      </h4>
      <div className="flex h-32 items-end justify-between gap-2.5">
        {rounds.map((round) => (
          <div key={round.round} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-extrabold tabular-nums text-slate-300">{round.eliminatedCount}</span>
            <div
              className="w-full rounded-t-md border-2 border-ink bg-arcade-red transition-[height] duration-500"
              style={{ height: `${Math.max(8, (round.eliminatedCount / maxCount) * 100)}%` }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">R{round.round}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
