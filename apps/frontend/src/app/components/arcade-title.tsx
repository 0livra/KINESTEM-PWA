/**
 * Título con letras multicolor rotadas y extrusión rosa + contorno de
 * tinta, replicando la wordmark del logo oficial KINESTEM.
 */
const LOGO_LETTER_COLORS = ['#F7E97A', '#7EC8E8', '#F6A9C4', '#F6B27A', '#A8D9A0'] as const;
const LOGO_LETTER_ROTATIONS = [-6, 4, -3, 5, -5, 3, -4, 6] as const;

export function ArcadeTitle({
  word = 'KINESTEM',
  className = 'text-4xl',
}: {
  word?: string;
  className?: string;
}) {
  return (
    <span
      role="heading"
      aria-label={word}
      className={`inline-flex flex-wrap items-baseline justify-center gap-x-0.5 font-display font-extrabold leading-none tracking-tight ${className}`}
    >
      {word.split('').map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          aria-hidden
          className="logo-extrusion inline-block"
          style={{
            color: LOGO_LETTER_COLORS[index % LOGO_LETTER_COLORS.length],
            transform: `rotate(${LOGO_LETTER_ROTATIONS[index % LOGO_LETTER_ROTATIONS.length]}deg)`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
