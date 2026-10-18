import { useMemo, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { ArcadeButton } from '../../components/arcade-button';

/**
 * Ruleta asimétrica en SVG puro (basada en la geometría de CrazyTim/spin-wheel).
 *
 * Regla de negocio exacta: totalWeight = 60, el sector del Premio de la
 * Caja Física (Servo SG90) pesa 10/60 = 1/6 ≈ 16.666% = 60° del disco.
 * Los 50 puntos de peso restantes (300°) solo otorgan puntos al saldo.
 */
export interface Sector {
  id: string;
  label: string;
  weight: number;
  color: string;
  rewardType: 'POINTS' | 'PHYSICAL_BOX';
  pointsValue: number;
}

export const ROULETTE_SECTORS: Sector[] = [
  { id: 'pts_50', label: '+50 PTS', weight: 20, color: '#3B82F6', rewardType: 'POINTS', pointsValue: 50 },
  { id: 'pts_100', label: '+100 PTS', weight: 14, color: '#10B981', rewardType: 'POINTS', pointsValue: 100 },
  { id: 'pts_150', label: '+150 PTS', weight: 10, color: '#F59E0B', rewardType: 'POINTS', pointsValue: 150 },
  { id: 'pts_250', label: '+250 PTS', weight: 6, color: '#8B5CF6', rewardType: 'POINTS', pointsValue: 250 },
  {
    id: 'physical_box_reward',
    label: 'CAJA FISICA',
    weight: 10,
    color: '#EF4444',
    rewardType: 'PHYSICAL_BOX',
    pointsValue: 0,
  },
];

export const TOTAL_WEIGHT = ROULETTE_SECTORS.reduce((acc, s) => acc + s.weight, 0); // 60

const CX = 200;
const CY = 200;
const RADIUS = 178;
const POINTER_ANGLE = 270; // Puntero superior fijo en coordenadas SVG (0° = derecha, horario)

interface SectorGeometry extends Sector {
  startAngle: number; // Grados SVG desde las 3 en punto, sentido horario
  sweepAngle: number;
  midAngle: number;
  pathD: string;
}

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function sectorPath(startAngle: number, sweep: number): string {
  const p1 = polarPoint(startAngle, RADIUS);
  const p2 = polarPoint(startAngle + sweep, RADIUS);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

/** Selección ponderada exacta: Math.random() * totalWeight sobre el acumulado. */
function pickWeightedWinner(sectors: SectorGeometry[]): SectorGeometry {
  const roll = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const sector of sectors) {
    cumulative += sector.weight;
    if (roll < cumulative) return sector;
  }
  return sectors[sectors.length - 1]!;
}

export interface AsymmetricRouletteProps {
  onSpinEnd: (winner: Sector) => void;
  disabled?: boolean;
  /** Costo fijo por giro (mostrado en el boton); 150 PTS por defecto. */
  costPoints?: number;
}

export function AsymmetricRoulette({ onSpinEnd, disabled = false, costPoints = 150 }: AsymmetricRouletteProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geometries = useMemo<SectorGeometry[]>(() => {
    let cursor = 0;
    return ROULETTE_SECTORS.map((sector) => {
      const sweepAngle = (sector.weight / TOTAL_WEIGHT) * 360; // p.ej. 10/60*360 = 60°
      const geometry: SectorGeometry = {
        ...sector,
        startAngle: cursor,
        sweepAngle,
        midAngle: cursor + sweepAngle / 2,
        pathD: sectorPath(cursor, sweepAngle),
      };
      cursor += sweepAngle;
      return geometry;
    });
  }, []);

  const handleSpin = () => {
    if (isSpinning || disabled) return;
    setIsSpinning(true);

    const winner = pickWeightedWinner(geometries);
    // Punto ganador dentro del sector (margen para no caer en el borde)
    const offset = winner.sweepAngle * (0.12 + Math.random() * 0.76);
    const targetPointAngle = winner.startAngle + offset;

    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (((POINTER_ANGLE - targetPointAngle - currentMod) % 360) + 360) % 360;
    const fullSpins = 360 * (5 + Math.floor(Math.random() * 3));

    setRotation(rotation + fullSpins + delta);

    if (spinTimeout.current) clearTimeout(spinTimeout.current);
    spinTimeout.current = setTimeout(() => {
      setIsSpinning(false);
      onSpinEnd(winner);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 400 400"
        className="h-auto w-full max-w-[340px] sm:max-w-[400px]"
        role="img"
        aria-label="Ruleta de premios con sector de caja fisica de un sexto del disco"
      >
        {/* Aro exterior */}
        <circle cx={CX} cy={CY} r={RADIUS + 11} fill="#0F172A" />
        <circle cx={CX} cy={CY} r={RADIUS + 4} fill="#F8FAFC" />

        {/* Disco giratorio */}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: isSpinning ? 'transform 4000ms cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
          }}
        >
          {geometries.map((sector) => {
            const labelPos = polarPoint(sector.midAngle, RADIUS * 0.62);
            return (
              <g key={sector.id}>
                <path d={sector.pathD} fill={sector.color} stroke="#0F172A" strokeWidth={3} strokeLinejoin="round" />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="#FFFFFF"
                  stroke="#0F172A"
                  strokeWidth={4}
                  paintOrder="stroke"
                  fontFamily="'Baloo 2', sans-serif"
                  fontSize={sector.label.length > 6 ? 17 : 22}
                  fontWeight={800}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${sector.midAngle + 90} ${labelPos.x} ${labelPos.y})`}
                >
                  {sector.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Centro decorativo fijo */}
        <circle cx={CX} cy={CY} r={34} fill="#0F172A" stroke="#F8FAFC" strokeWidth={5} />
        <text
          x={CX}
          y={CY + 1}
          fill="#F7E97A"
          fontFamily="'Baloo 2', sans-serif"
          fontSize={17}
          fontWeight={800}
          textAnchor="middle"
          dominantBaseline="central"
        >
          KINE
        </text>

        {/* Puntero superior fijo (polygon vectorial) */}
        <polygon
          points={`${CX - 17},10 ${CX + 17},10 ${CX},44`}
          fill="#EF4444"
          stroke="#0F172A"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </svg>

      <ArcadeButton
        variant="yellow"
        size="lg"
        icon={RotateCw}
        disabled={isSpinning || disabled}
        onClick={handleSpin}
        className="min-w-[220px]"
      >
        {isSpinning ? 'Girando ruleta...' : `Girar ruleta (${costPoints} PTS)`}
      </ArcadeButton>
    </div>
  );
}
