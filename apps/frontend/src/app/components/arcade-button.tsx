import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Botón físico de consola portátil: borde grueso de tinta, sombra dura
 * desplazada y estado activo táctil que "hunde" el botón.
 */
export type ArcadeButtonVariant =
  | 'yellow'
  | 'red'
  | 'blue'
  | 'green'
  | 'violet'
  | 'sky'
  | 'dark'
  | 'magenta';

export type ArcadeButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ArcadeButtonVariant, string> = {
  yellow: 'bg-arcade-yellow text-ink',
  red: 'bg-arcade-red text-white',
  blue: 'bg-arcade-blue-btn text-white',
  green: 'bg-arcade-emerald text-ink',
  violet: 'bg-arcade-violet text-white',
  sky: 'bg-arcade-sky text-ink',
  dark: 'bg-ink text-arcade-yellow border-slate-500',
  magenta: 'bg-arcade-magenta text-white',
};

const SIZE_CLASSES: Record<ArcadeButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg border-2 shadow-[3px_3px_0px_#0F172A] min-h-[36px]',
  md: 'px-4 py-2.5 text-sm rounded-xl border-[3px] shadow-[4px_4px_0px_#0F172A] min-h-[44px]',
  lg: 'px-6 py-3.5 text-base rounded-2xl border-4 shadow-[5px_5px_0px_#0F172A] min-h-[52px]',
};

export interface ArcadeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ArcadeButtonVariant;
  size?: ArcadeButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  block?: boolean;
  children?: ReactNode;
}

export function ArcadeButton({
  variant = 'yellow',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  block = false,
  className = '',
  children,
  ...rest
}: ArcadeButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex select-none items-center justify-center gap-2 font-display font-extrabold uppercase tracking-wide transition-all duration-100 active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${block ? 'w-full' : ''} ${className}`}
    >
      {Icon && iconPosition === 'left' ? <Icon className="h-[1.15em] w-[1.15em] shrink-0" aria-hidden /> : null}
      {children}
      {Icon && iconPosition === 'right' ? <Icon className="h-[1.15em] w-[1.15em] shrink-0" aria-hidden /> : null}
    </button>
  );
}
