/**
 * Componente SVG puro de personajes LED inspirado en el diseno vectorial oficial
 * con trazos definidos, patillas metalicas de polaridad (anodo/catodo) y expresiones
 * gestuales de estilo arcade.
 */

export type LedColor = 'red' | 'green' | 'blue' | 'orange' | 'cream' | 'yellow' | 'pink';
export type LedExpression = 'wink' | 'smile' | 'serious' | 'dizzy' | 'angry' | 'sleepy' | 'kiss';

export interface LedAvatarProps {
  color: LedColor;
  expression: LedExpression;
  size?: number;
  className?: string;
  /** Mostrar sutil brillo especular sobre el domo */
  glossy?: boolean;
}

const COLOR_MAP: Record<LedColor, string> = {
  red: '#FF1E1E',
  green: '#00E500',
  blue: '#0038FF',
  orange: '#FF5500',
  cream: '#FFE6BD',
  yellow: '#FFB800',
  pink: '#FF70A6',
};

export function LedAvatarSVG({
  color,
  expression,
  size = 64,
  className = '',
  glossy = true,
}: LedAvatarProps) {
  const capsuleColor = COLOR_MAP[color] ?? COLOR_MAP.red;
  // En LED azul oscuro, las facciones son blancas para maximo contraste
  const isBlue = color === 'blue';
  const faceColor = isBlue ? '#FFFFFF' : '#0F172A';
  const strokeColor = '#0F172A';

  // Renderizado de las patillas metalicas inferiores (anodo y catodo)
  const renderPins = () => {
    // Para expresion "dizzy" (aturdido), la patilla izquierda vibra en zigzag
    const leftPinPath =
      expression === 'dizzy'
        ? 'M 35 58 L 35 66 L 32 68 L 32 70 L 35 72 L 35 73 L 43 78 L 29 84 L 42 90 L 22 96 L 25.5 98.5 L 47 91 L 34 85 L 48 79 L 41 73 L 41 72 L 44 70 L 44 68 L 41 66 L 41 58 Z'
        : 'M 35 58 L 35 66 L 32 68 L 32 70 L 35 72 L 35 82 L 22 93 L 25.5 96.5 L 41 85 L 41 72 L 44 70 L 44 68 L 41 66 L 41 58 Z';

    // Patilla derecha recta estandar con muesca de tope
    const rightPinPath =
      'M 59 58 L 59 66 L 56 68 L 56 70 L 59 72 L 59 87 L 65 87 L 65 72 L 68 70 L 68 68 L 65 66 L 65 58 Z';

    return (
      <g className="led-pins">
        <path
          d={leftPinPath}
          fill="#D4D4D8"
          stroke={strokeColor}
          strokeWidth={2.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={rightPinPath}
          fill="#D4D4D8"
          stroke={strokeColor}
          strokeWidth={2.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    );
  };

  // Renderizado de las expresiones faciales segun la hoja de diseno
  const renderFace = () => {
    switch (expression) {
      case 'wink':
        return (
          <g className="led-face led-face-wink">
            {/* Ojo izquierdo en pildora vertical */}
            <rect x="37.5" y="23" width="5.5" height="11" rx="2.75" fill={faceColor} />
            {/* Ojo derecho en arco / pestaneo ^ */}
            <path
              d="M 54.5 28.5 L 59.5 22 L 64.5 28"
              fill="none"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Boca abierta alegre inclinada */}
            <path
              d="M 43 39.5 Q 52 39.5 61 35.5 C 60 44.5, 53 46.5, 43 39.5 Z"
              fill={faceColor}
              stroke={faceColor}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          </g>
        );

      case 'smile':
        return (
          <g className="led-face led-face-smile">
            {/* Dos ojos en pildora vertical */}
            <rect x="37.5" y="23" width="5.5" height="11" rx="2.75" fill={faceColor} />
            <rect x="57" y="23" width="5.5" height="11" rx="2.75" fill={faceColor} />
            {/* Sonrisa clasica con ligera inclinacion */}
            <path
              d="M 43 39 Q 50 45 58 39"
              fill="none"
              stroke={faceColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        );

      case 'serious':
        return (
          <g className="led-face led-face-serious">
            {/* Cejas rectas horizontales */}
            <line
              x1="33"
              y1="21.5"
              x2="47"
              y2="21.5"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <line
              x1="53"
              y1="21.5"
              x2="67"
              y2="21.5"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            {/* Ojos concentrados bajo las cejas */}
            <rect x="37.5" y="24" width="5.5" height="9" rx="2.75" fill={faceColor} />
            <rect x="57" y="24" width="5.5" height="9" rx="2.75" fill={faceColor} />
            {/* Boca recta horizontal */}
            <line
              x1="43"
              y1="41"
              x2="57"
              y2="41"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
          </g>
        );

      case 'dizzy':
        return (
          <g className="led-face led-face-dizzy">
            {/* Ojos en espiral */}
            <path
              d="M 40.5 28.5 A 2 2 0 0 1 42.5 28.5 A 4 4 0 0 1 36.5 28.5 A 6 6 0 0 1 44.5 28.5 A 8 8 0 0 1 34 28.5"
              fill="none"
              stroke={faceColor}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <path
              d="M 59.5 28.5 A 2 2 0 0 1 61.5 28.5 A 4 4 0 0 1 55.5 28.5 A 6 6 0 0 1 63.5 28.5 A 8 8 0 0 1 53 28.5"
              fill="none"
              stroke={faceColor}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            {/* Boca temblorosa asimetrica */}
            <path
              d="M 43 42.5 C 45 38.5, 49 41.5, 52 38.5 C 56 40, 57 44, 54 46.5 C 50 47, 46 44.5, 43 42.5 Z"
              fill={faceColor}
              stroke={faceColor}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </g>
        );

      case 'angry':
        return (
          <g className="led-face led-face-angry">
            {/* Cejas inclinadas de determinacion/enojo */}
            <line
              x1="33"
              y1="19.5"
              x2="47"
              y2="24"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <line
              x1="67"
              y1="19.5"
              x2="53"
              y2="24"
              stroke={faceColor}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <rect x="37.5" y="25.5" width="5.5" height="9" rx="2.75" fill={faceColor} />
            <rect x="57" y="25.5" width="5.5" height="9" rx="2.75" fill={faceColor} />
            {/* Boca mostrando dientes apretados */}
            <rect
              x="42.5"
              y="38"
              width="15"
              height="6.5"
              rx="2"
              fill={isBlue ? '#0038FF' : '#FFFFFF'}
              stroke={faceColor}
              strokeWidth={2.2}
            />
            <line
              x1="42.5"
              y1="41.25"
              x2="57.5"
              y2="41.25"
              stroke={faceColor}
              strokeWidth={1.5}
            />
            <line
              x1="47.5"
              y1="38"
              x2="47.5"
              y2="44.5"
              stroke={faceColor}
              strokeWidth={1.5}
            />
            <line
              x1="52.5"
              y1="38"
              x2="52.5"
              y2="44.5"
              stroke={faceColor}
              strokeWidth={1.5}
            />
          </g>
        );

      case 'sleepy':
        return (
          <g className="led-face led-face-sleepy">
            {/* Ojos cerrados relajados */}
            <line
              x1="36"
              y1="28"
              x2="45"
              y2="28"
              stroke={faceColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1="55"
              y1="28"
              x2="64"
              y2="28"
              stroke={faceColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Boca recta tranquila */}
            <line
              x1="44"
              y1="41"
              x2="56"
              y2="41"
              stroke={faceColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        );

      case 'kiss':
        return (
          <g className="led-face led-face-kiss">
            {/* Ojos en pildora vertical */}
            <rect x="37.5" y="23" width="5.5" height="11" rx="2.75" fill={faceColor} />
            <rect x="57" y="23" width="5.5" height="11" rx="2.75" fill={faceColor} />
            {/* Boca de silbido/beso en 3 */}
            <path
              d="M 52.5 38 Q 47.5 39 49.5 41 Q 47.5 43 52.5 44"
              fill="none"
              stroke={faceColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 overflow-visible select-none ${className}`}
      role="img"
      aria-label={`Personaje LED ${color} con expresion ${expression}`}
    >
      {/* 1. Patillas metalicas inferiores (bajo la capsula) */}
      {renderPins()}

      {/* 2. Capsula principal / Domo de cilindro y arco superior */}
      <path
        d="M 28 50 L 28 26 A 22 20 0 0 1 72 26 L 72 50 Z"
        fill={capsuleColor}
        stroke={strokeColor}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* 3. Reflejo especular sutil para aspecto de plastico translucido LED */}
      {glossy && (
        <g className="led-gloss opacity-80" aria-hidden="true">
          <path
            d="M 33 46 L 33 26 A 17 15 0 0 1 50 11"
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <path
            d="M 59 13 A 17 15 0 0 1 65 18"
            fill="none"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 4. Reborde / Collar inferior ensanchado de la capsula LED */}
      <rect
        x="23"
        y="50"
        width="54"
        height="10"
        rx="3.5"
        fill={capsuleColor}
        stroke={strokeColor}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* 5. Rasgos gestuales */}
      {renderFace()}
    </svg>
  );
}
