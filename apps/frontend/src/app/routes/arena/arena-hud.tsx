import { Timer } from 'lucide-react';
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
    <div className="rounded-2xl border-4 border-ink bg-ink p-4 shadow-[5px_5px_0px_rgba(15,23,42,0.6)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-arcade-sky">
            Ronda {ronda} · Concepto: {stemConcept}
          </p>
          <h3 className="mt-0.5 truncate font-display text-base font-extrabold uppercase leading-tight tracking-wide text-white">
            {challengeInstruction}
          </h3>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LivesIndicator lives={vidas} />
          <span
            className={`flex items-center gap-1 font-display text-lg font-extrabold tabular-nums ${
              isUrgent ? 'animate-pulse text-arcade-red' : 'text-arcade-yellow'
            }`}
          >
            <Timer className="h-4 w-4" aria-hidden />
            {timerSeconds}s
          </span>
        </div>
      </div>

      {/* Barra de tiempo restante */}
      <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-slate-700 bg-slate-900">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            isUrgent ? 'bg-arcade-red' : 'bg-arcade-emerald'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
