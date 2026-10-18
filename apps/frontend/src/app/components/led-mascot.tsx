/**
 * Mascots vectoriales de componentes electrónicos expresivos,
 * inspirados en el logo oficial KINESTEM: trazos gruesos de tinta,
 * colores planos tipo sticker y caritas kawaii.
 */

export type MascotFaceType =
  | 'idle'
  | 'waiting'
  | 'happy'
  | 'cheer'
  | 'confused'
  | 'error'
  | 'wink'
  | 'surprised';

interface FaceRenderOptions {
  stroke?: string;
  fill?: string;
}

/** Cara kawaii centrada en (0, 0) dentro de un área ~32x28. */
function MascotFace({ face, stroke = '#0F172A', fill = '#0F172A' }: FaceRenderOptions & { face: MascotFaceType }) {
  const s = { stroke, fill, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (face) {
    case 'idle':
      return (
        <g {...s} fill="none">
          <circle cx={-8} cy={-4} r={3} fill={fill} stroke="none" />
          <circle cx={8} cy={-4} r={3} fill={fill} stroke="none" />
          <path d="M -6 5 Q 0 10 6 5" />
        </g>
      );
    case 'waiting':
      return (
        <g {...s} fill="none">
          <path d="M -12 -4 L -4 -4" />
          <path d="M 4 -4 L 12 -4" />
          <circle cx={0} cy={6} r={2.6} fill={fill} stroke="none" />
        </g>
      );
    case 'happy':
      return (
        <g {...s} fill="none">
          <path d="M -12 -2 Q -8 -9 -4 -2" />
          <path d="M 4 -2 Q 8 -9 12 -2" />
          <path d="M -8 3 Q 0 13 8 3 Z" fill={fill} />
          <ellipse cx={-14} cy={4} rx={3.4} ry={2.2} fill="#F6A9C4" stroke="none" opacity={0.85} />
          <ellipse cx={14} cy={4} rx={3.4} ry={2.2} fill="#F6A9C4" stroke="none" opacity={0.85} />
        </g>
      );
    case 'cheer':
      return (
        <g {...s} fill="none">
          <path d="M -12 -7 L -9.5 -3.5 L -14 -3.5 Z M -12 -7 L -9.5 -3.5 L -14 -3.5 L -12 -7" fill={fill} />
          <path d="M -12 -7 L -10 -2 L -14 -2 Z" fill={fill} stroke="none" />
          <path d="M 12 -7 L 14 -2 L 10 -2 Z" fill={fill} stroke="none" />
          <path d="M -9 3 Q 0 15 9 3 Z" fill={fill} />
          <ellipse cx={-15} cy={4} rx={3.2} ry={2.2} fill="#F6A9C4" stroke="none" opacity={0.85} />
          <ellipse cx={15} cy={4} rx={3.2} ry={2.2} fill="#F6A9C4" stroke="none" opacity={0.85} />
        </g>
      );
    case 'confused':
      return (
        <g {...s} fill="none">
          <path d="M -13 -9 L -5 -6" />
          <path d="M 13 -11 L 6 -7" />
          <circle cx={-8} cy={-2} r={3} fill={fill} stroke="none" />
          <path d="M 4 -1 Q 8 -5 12 -1" />
          <path d="M -7 7 q 3.5 -3.5 7 0 q 3.5 3.5 7 0" />
        </g>
      );
    case 'error':
      return (
        <g {...s} fill="none">
          <path d="M -11 -7 L -5 -1 M -5 -7 L -11 -1" />
          <path d="M 5 -7 L 11 -1 M 11 -7 L 5 -1" />
          <path d="M -6 7 L 6 7" />
        </g>
      );
    case 'wink':
      return (
        <g {...s} fill="none">
          <path d="M -12 -2 Q -8 -8 -4 -2" />
          <circle cx={8} cy={-3} r={3} fill={fill} stroke="none" />
          <path d="M -6 4 Q 0 10 6 4" />
        </g>
      );
    case 'surprised':
      return (
        <g {...s} fill="none">
          <circle cx={-8} cy={-4} r={4.4} fill={fill} stroke="none" />
          <circle cx={8} cy={-4} r={4.4} fill={fill} stroke="none" />
          <circle cx={-6.6} cy={-5.4} r={1.3} fill="#FFFFFF" stroke="none" />
          <circle cx={9.4} cy={-5.4} r={1.3} fill="#FFFFFF" stroke="none" />
          <circle cx={0} cy={6} r={3.6} fill={fill} stroke="none" />
        </g>
      );
  }
}

/* ------------------------------------------------------------------ */

export type LedColor = 'red' | 'blue' | 'green' | 'yellow';

const LED_FILL: Record<LedColor, string> = {
  red: '#EF4444',
  blue: '#60A5FA',
  green: '#4ADE80',
  yellow: '#F7E97A',
};

/** LED de 5mm antropomórfico con patas metálicas. */
export function LedMascot({
  color = 'red',
  face = 'idle',
  className = 'h-20 w-20',
}: {
  color?: LedColor;
  face?: MascotFaceType;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label={`LED ${color} con cara ${face}`}>
      {/* Patas metálicas */}
      <path d="M 48 116 L 42 148" stroke="#0F172A" strokeWidth={10} strokeLinecap="round" />
      <path d="M 72 116 L 78 148" stroke="#0F172A" strokeWidth={10} strokeLinecap="round" />
      <path d="M 48 116 L 42 148" stroke="#CBD5E1" strokeWidth={5} strokeLinecap="round" />
      <path d="M 72 116 L 78 148" stroke="#CBD5E1" strokeWidth={5} strokeLinecap="round" />
      {/* Cúpula */}
      <path
        d="M 24 100 C 24 52 40 24 60 24 C 80 24 96 52 96 100 Z"
        fill={LED_FILL[color]}
        stroke="#0F172A"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      {/* Reborde */}
      <rect x={28} y={96} width={64} height={22} rx={9} fill="#0F172A" />
      {/* Brillo */}
      <path d="M 37 62 C 39 45 47 34 55 31" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" opacity={0.85} fill="none" />
      {/* Cara */}
      <g transform="translate(60 66)">
        <MascotFace face={face} />
      </g>
    </svg>
  );
}

/** Circuito integrado (chip DIP) con carita. */
export function ChipMascot({
  face = 'idle',
  className = 'h-20 w-20',
}: {
  face?: MascotFaceType;
  className?: string;
}) {
  const pins = [40, 56, 72, 88];
  return (
    <svg viewBox="0 0 120 130" className={className} role="img" aria-label="Chip con carita">
      {pins.map((y) => (
        <g key={`l${y}`}>
          <rect x={2} y={y} width={18} height={9} rx={2.5} fill="#0F172A" />
          <rect x={4.5} y={y + 2.5} width={13} height={4} rx={1.5} fill="#CBD5E1" />
        </g>
      ))}
      {pins.map((y) => (
        <g key={`r${y}`}>
          <rect x={100} y={y} width={18} height={9} rx={2.5} fill="#0F172A" />
          <rect x={102.5} y={y + 2.5} width={13} height={4} rx={1.5} fill="#CBD5E1" />
        </g>
      ))}
      <rect x={16} y={26} width={88} height={82} rx={12} fill="#1E293B" stroke="#0F172A" strokeWidth={6} />
      <path d="M 50 26 a 10 8 0 0 1 20 0" fill="#0F172A" />
      <circle cx={30} cy={40} r={3} fill="#F7E97A" />
      <g transform="translate(60 68)">
        <MascotFace face={face} stroke="#F8FAFC" fill="#F8FAFC" />
      </g>
    </svg>
  );
}

/** Capacitor electrolítico preocupado. */
export function CapacitorMascot({
  face = 'confused',
  className = 'h-20 w-20',
}: {
  face?: MascotFaceType;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label="Capacitor con carita">
      {/* Patas */}
      <path d="M 46 112 L 40 148" stroke="#0F172A" strokeWidth={10} strokeLinecap="round" />
      <path d="M 74 112 L 80 148" stroke="#0F172A" strokeWidth={10} strokeLinecap="round" />
      <path d="M 46 112 L 40 148" stroke="#CBD5E1" strokeWidth={5} strokeLinecap="round" />
      <path d="M 74 112 L 80 148" stroke="#CBD5E1" strokeWidth={5} strokeLinecap="round" />
      {/* Cuerpo */}
      <rect x={32} y={34} width={56} height={80} rx={12} fill="#1D4ED8" stroke="#0F172A" strokeWidth={6} />
      {/* Franja de polaridad */}
      <rect x={32} y={34} width={17} height={80} rx={9} fill="#93C5FD" opacity={0.9} />
      <path d="M 40 46 L 40 102" stroke="#0F172A" strokeWidth={3} strokeLinecap="round" />
      {/* Tapa superior */}
      <ellipse cx={60} cy={34} rx={28} ry={9} fill="#94A3B8" stroke="#0F172A" strokeWidth={6} />
      <path d="M 34 38 C 40 34 80 34 86 38" stroke="#0F172A" strokeWidth={3} fill="none" opacity={0.4} />
      {/* Cara */}
      <g transform="translate(64 76)">
        <MascotFace face={face} stroke="#F8FAFC" fill="#F8FAFC" />
      </g>
    </svg>
  );
}

/** Caja misteriosa del dispensador físico (Servo SG90). */
export function GiftBoxMascot({
  face = 'wink',
  className = 'h-20 w-20',
}: {
  face?: MascotFaceType;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 130" className={className} role="img" aria-label="Caja misteriosa">
      {/* Lazo */}
      <path d="M 60 30 C 44 12 26 22 38 34 C 44 39 54 37 60 34" fill="#F7E97A" stroke="#0F172A" strokeWidth={5} strokeLinejoin="round" />
      <path d="M 60 30 C 76 12 94 22 82 34 C 76 39 66 37 60 34" fill="#F7E97A" stroke="#0F172A" strokeWidth={5} strokeLinejoin="round" />
      {/* Cuerpo */}
      <rect x={20} y={44} width={80} height={66} rx={9} fill="#F6A9C4" stroke="#0F172A" strokeWidth={6} />
      {/* Tapa */}
      <rect x={13} y={32} width={94} height={20} rx={7} fill="#F9A8D4" stroke="#0F172A" strokeWidth={6} />
      {/* Cinta */}
      <rect x={51} y={32} width={18} height={78} fill="#F7E97A" stroke="#0F172A" strokeWidth={5} />
      {/* Estrella decorativa */}
      <path
        d="M 78 78 C 78.8 73.4 81.4 70.8 86 70 C 81.4 69.2 78.8 66.6 78 62 C 77.2 66.6 74.6 69.2 70 70 C 74.6 70.8 77.2 73.4 78 78 Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Cara en la tapa */}
      <g transform="translate(34 42)">
        <MascotFace face={face} />
      </g>
    </svg>
  );
}
