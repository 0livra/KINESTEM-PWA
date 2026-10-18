import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Panel arcade genérico: borde grueso de tinta, sombra dura desplazada
 * y cabecera opcional con chip de icono. Nada de tarjetas corporativas
 * planas: cada panel es una pieza física de consola.
 */
export type PanelTone = 'ink' | 'navy' | 'yellow' | 'green' | 'red' | 'sky' | 'amber' | 'magenta';

const TONE_CLASSES: Record<PanelTone, string> = {
  ink: 'bg-ink text-slate-100',
  navy: 'bg-arcade-navy-deep text-white',
  yellow: 'bg-arcade-yellow text-ink',
  green: 'bg-arcade-emerald text-ink',
  red: 'bg-arcade-red text-white',
  sky: 'bg-arcade-sky text-ink',
  amber: 'bg-arcade-amber text-ink',
  magenta: 'bg-arcade-magenta text-white',
};

const TONE_CHIP_CLASSES: Record<PanelTone, string> = {
  ink: 'bg-arcade-yellow text-ink',
  navy: 'bg-arcade-yellow text-ink',
  yellow: 'bg-ink text-arcade-yellow',
  green: 'bg-ink text-arcade-emerald',
  red: 'bg-white text-arcade-red',
  sky: 'bg-ink text-arcade-sky',
  amber: 'bg-ink text-arcade-amber',
  magenta: 'bg-white text-arcade-magenta',
};

export interface PanelCardProps {
  title?: string;
  icon?: LucideIcon;
  tone?: PanelTone;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function PanelCard({
  title,
  icon: Icon,
  tone = 'ink',
  className = '',
  bodyClassName = '',
  children,
}: PanelCardProps) {
  return (
    <section
      className={`rounded-2xl border-4 border-ink p-4 shadow-[5px_5px_0px_#0F172A] ${TONE_CLASSES[tone]} ${className}`}
    >
      {title ? (
        <header className="mb-3 flex items-center gap-2 border-b-[3px] border-current/25 pb-2">
          {Icon ? (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[3px] border-ink ${TONE_CHIP_CLASSES[tone]}`}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <h2 className="panel-title-extrusion font-display text-base font-extrabold uppercase leading-tight tracking-wide">
            {title}
          </h2>
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
