import { HeartPulse } from 'lucide-react';

export interface ParticipantItem {
  id: number;
  username: string;
  rfidUid: string | null;
  vidas: number;
  ready: boolean;
}

/** Vidas como corazones vectoriales (cero emojis). */
export function LivesIndicator({ lives, maxLives = 3 }: { lives: number; maxLives?: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${lives} de ${maxLives} vidas`}>
      {Array.from({ length: maxLives }).map((_, idx) => (
        <HeartPulse
          key={idx}
          className={`h-5 w-5 ${idx < lives ? 'text-arcade-red' : 'text-slate-600 opacity-40'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function PlayerCard({ player }: { player: ParticipantItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-ink bg-arcade-yellow p-3 shadow-[4px_4px_0px_#0F172A]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-ink bg-arcade-sky font-display text-lg font-extrabold text-ink"
          aria-hidden
        >
          {player.username.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h4 className="truncate font-display text-sm font-extrabold uppercase tracking-wide text-ink">
            {player.username}
          </h4>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-ink/70">
            {player.rfidUid ? `Credencial ${player.rfidUid}` : 'Sin credencial'} ·{' '}
            {player.ready ? 'Listo' : 'En espera'}
          </p>
        </div>
      </div>
      <LivesIndicator lives={player.vidas} />
    </div>
  );
}
