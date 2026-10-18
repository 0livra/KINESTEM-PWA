/**
 * Destellos vectoriales estilo sticker (estrellas de 4 puntas y
 * diamantes), extraídos del lenguaje visual del logo KINESTEM.
 */

export function FourPointStar({
  className = 'h-5 w-5',
  color = '#F7D95C',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1.5 C13.2 7.5 16.5 10.8 22.5 12 C16.5 13.2 13.2 16.5 12 22.5 C10.8 16.5 7.5 13.2 1.5 12 C7.5 10.8 10.8 7.5 12 1.5 Z"
        fill={color}
        stroke="#0F172A"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DiamondSparkle({
  className = 'h-4 w-4',
  color = '#7EC8E8',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 3 Q13.5 10.5 21 12 Q13.5 13.5 12 21 Q10.5 13.5 3 12 Q10.5 10.5 12 3 Z"
        fill={color}
        stroke="#0F172A"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MiniHeartSparkle({
  className = 'h-4 w-4',
  color = '#F2A0B8',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 21 C 5 15.5 2.5 12 2.5 8.6 C 2.5 5.9 4.7 4 7.2 4 C 9 4 10.9 5 12 6.8 C 13.1 5 15 4 16.8 4 C 19.3 4 21.5 5.9 21.5 8.6 C 21.5 12 19 15.5 12 21 Z"
        fill={color}
        stroke="#0F172A"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}
