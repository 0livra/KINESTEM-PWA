/**
 * Cabecera superior tipo consola portátil: botón táctil azul con insignia
 * circular "B" (Volver) a la izquierda, círculo central de usuario con avatar LED,
 * y botón rojo con insignia "A" (Seleccionar) a la derecha, sobre una barra azul
 * profundo con rayas.
 */
import { LedAvatarSVG } from './led-avatar-svg';

export interface ConsoleTopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSelect?: () => void;
  backLabel?: string;
  selectLabel?: string;
  /** Avatar LED del usuario activo (opcional, muestra icono genérico si no se proporciona) */
  avatarColor?: 'red' | 'green' | 'blue' | 'orange' | 'cream';
  avatarExpression?: 'wink' | 'smile' | 'serious' | 'dizzy';
  showUserAvatar?: boolean;
}

function BadgeButton({
  badge,
  label,
  tone,
  disabled,
  onClick,
}: {
  badge: 'B' | 'A';
  label: string;
  tone: 'blue' | 'red';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-arcade-blue-btn shadow-[3px_3px_0px_#0F172A]'
      : 'bg-arcade-red shadow-[3px_3px_0px_#0F172A]';
  const badgeClass = tone === 'blue' ? 'text-arcade-blue-btn' : 'text-arcade-red';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} (boton ${badge})`}
      className={`flex min-h-[40px] items-center gap-1.5 rounded-full border-[3px] border-ink px-2 py-1 transition-all duration-100 active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-45 ${toneClass}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-white font-display text-sm font-extrabold ${badgeClass}`}
        aria-hidden
      >
        {badge}
      </span>
      <span className="pr-1 font-display text-xs font-extrabold uppercase tracking-wider text-white sm:text-sm">
        {label}
      </span>
    </button>
  );
}

export function ConsoleTopBar({
  title,
  subtitle,
  onBack,
  onSelect,
  backLabel = 'Volver',
  selectLabel = 'Seleccionar',
  avatarColor = 'red',
  avatarExpression = 'smile',
  showUserAvatar = false,
}: ConsoleTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b-4 border-ink bg-arcade-navy-deep bg-stripes-dark pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-3 py-2.5">
        <BadgeButton badge="B" label={backLabel} tone="blue" onClick={onBack} disabled={!onBack} />

        {/* Círculo central de usuario con avatar LED */}
        {showUserAvatar ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-arcade-navy shadow-[2px_2px_0px_#0F172A]">
            <LedAvatarSVG
              color={avatarColor}
              expression={avatarExpression}
              size={40}
              className="h-10 w-10"
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1 text-center">
            <h1 className="panel-title-extrusion truncate font-display text-lg font-extrabold uppercase leading-tight tracking-wide text-white">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-arcade-sky-deep">
                {subtitle}
              </p>
            ) : null}
          </div>
        )}

        <BadgeButton badge="A" label={selectLabel} tone="red" onClick={onSelect} disabled={!onSelect} />
      </div>
    </header>
  );
}
