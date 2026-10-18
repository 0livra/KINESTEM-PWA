import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

/**
 * Tarjeta de modo estilo maletín/portacredencial del menú de selección
 * (WarioWare Gold): pestaña superior ranurada, contorno grueso de tinta,
 * esquinas reforzadas, inclinación física y etiqueta NEW en la destacada.
 */
export type FolderCardTone = 'magenta' | 'amber' | 'sky' | 'emerald';

const TONE_CLASSES: Record<FolderCardTone, string> = {
  magenta: 'bg-halftone-magenta text-white',
  amber: 'bg-arcade-amber text-ink',
  sky: 'bg-arcade-sky text-ink',
  emerald: 'bg-arcade-emerald text-ink',
};

export interface FolderModeCardProps {
  tag: string;
  title: string;
  subtitle: string;
  tone: FolderCardTone;
  rotate: number;
  featured?: boolean;
  locked?: boolean;
  selected?: boolean;
  onSelect: () => void;
  children?: ReactNode;
}

export function FolderModeCard({
  tag,
  title,
  subtitle,
  tone,
  rotate,
  featured = false,
  locked = false,
  selected = false,
  onSelect,
  children,
}: FolderModeCardProps) {
  return (
    <div
      className="relative"
      style={{ transform: `rotate(${rotate}deg)`, transition: 'transform 150ms ease-out' }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={locked ? `${title} (bloqueado hasta vincular la estación)` : title}
        className={`relative block w-full overflow-visible rounded-2xl border-4 border-ink p-4 text-left shadow-[6px_6px_0px_#0F172A] transition-all duration-150 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${
          TONE_CLASSES[tone]
        } ${featured ? 'min-h-[190px] p-5' : 'min-h-[150px]'} ${
          selected ? 'outline outline-4 outline-offset-[3px] outline-arcade-yellow -translate-y-1' : ''
        }`}
      >
        {/* Pestaña superior ranurada */}
        <span className="absolute -top-4 left-1/2 flex h-8 w-max min-w-[118px] -translate-x-1/2 items-center justify-center gap-2 rounded-t-xl border-[3px] border-b-0 border-ink bg-ink px-3">
          <span className="h-1.5 w-8 rounded-full bg-arcade-yellow/60" aria-hidden />
          <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-arcade-yellow">
            {tag}
          </span>
          <span className="h-1.5 w-8 rounded-full bg-arcade-yellow/60" aria-hidden />
        </span>

        {/* Etiqueta NEW para la tarjeta destacada */}
        {featured && !locked ? (
          <span className="absolute -top-3 right-2 rotate-12 rounded-md border-[3px] border-ink bg-arcade-yellow px-2 py-0.5 font-display text-xs font-extrabold uppercase tracking-widest text-ink shadow-[2px_2px_0px_#0F172A]">
            New
          </span>
        ) : null}

        {/* Esquinas reforzadas */}
        <span aria-hidden className="absolute left-1.5 top-1.5 h-4 w-4 rounded-tl-lg border-l-4 border-t-4 border-ink/70" />
        <span aria-hidden className="absolute right-1.5 top-1.5 h-4 w-4 rounded-tr-lg border-r-4 border-t-4 border-ink/70" />
        <span aria-hidden className="absolute bottom-1.5 left-1.5 h-4 w-4 rounded-bl-lg border-b-4 border-l-4 border-ink/70" />
        <span aria-hidden className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-br-lg border-b-4 border-r-4 border-ink/70" />

        {/* Contenido */}
        <div className={`flex h-full flex-col ${featured ? 'pt-3' : 'pt-2'}`}>
          <div className="flex flex-1 items-center justify-center py-2">
            {locked ? (
              <span
                className="logo-extrusion animate-wiggle font-display text-7xl font-extrabold text-arcade-yellow"
                aria-hidden
              >
                ?
              </span>
            ) : (
              children
            )}
          </div>
          <div className="mt-auto">
            <h3 className="panel-title-extrusion font-display text-lg font-extrabold uppercase leading-none tracking-wide">
              {title}
            </h3>
            {locked ? (
              <span className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-ink/85 px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-arcade-yellow">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Vincula la Estacion Fisica
              </span>
            ) : (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-90">{subtitle}</p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
