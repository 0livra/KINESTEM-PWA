import { useState } from 'react';

export interface RouletteSegment {
  id: number;
  titulo: string;
  peso_probabilidad: number;
  tipo_premio: string;
  valor_premio: number;
  color_hex: string;
}

export interface RouletteWheelProps {
  segments: RouletteSegment[];
  onSpinEnd: (segment: RouletteSegment) => void;
  disabled?: boolean;
}

export function RouletteWheel({ segments, onSpinEnd, disabled }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpin = () => {
    if (isSpinning || disabled || segments.length === 0) return;

    setIsSpinning(true);
    // Giro aleatorio de 5 a 8 vueltas completas más compensación de segmento
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const randomAngle = Math.floor(Math.random() * 360);
    const targetRotation = rotation + extraSpins + randomAngle;

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      // Calcular índice de segmento seleccionado según el ángulo final
      const normalizedAngle = (360 - (targetRotation % 360)) % 360;
      const segmentAngle = 360 / segments.length;
      const selectedIndex = Math.floor(normalizedAngle / segmentAngle);
      const winner = segments[selectedIndex] || segments[0]!;
      onSpinEnd(winner);
    }, 4000);
  };

  const angleStep = 360 / (segments.length || 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      {/* Indicador de flecha superior */}
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '20px solid #EF4444',
            zIndex: 10,
          }}
        />

        {/* Disco de la Ruleta */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            position: 'relative',
            overflow: 'hidden',
            border: '6px solid #334155',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
          }}
        >
          {segments.map((seg, idx) => {
            const startAngle = idx * angleStep;
            return (
              <div
                key={seg.id}
                style={{
                  position: 'absolute',
                  width: '50%',
                  height: '50%',
                  top: 0,
                  right: 0,
                  transformOrigin: '0% 100%',
                  transform: `rotate(${startAngle}deg) skewY(${90 - angleStep}deg)`,
                  backgroundColor: seg.color_hex,
                }}
              />
            );
          })}
          {/* Centro decorativo de la ruleta */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 50,
              height: 50,
              borderRadius: '50%',
              backgroundColor: '#0F172A',
              border: '4px solid #F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#38BDF8',
              fontSize: '0.8rem',
            }}
          >
            KINE
          </div>
        </div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning || disabled}
        style={{
          padding: '0.85rem 2rem',
          backgroundColor: isSpinning ? '#64748B' : '#EAB308',
          color: '#0F172A',
          border: 'none',
          borderRadius: 8,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: isSpinning || disabled ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
        }}
      >
        {isSpinning ? 'Girando la Ruleta...' : '¡Girar Ruleta! 🎡'}
      </button>
    </div>
  );
}
