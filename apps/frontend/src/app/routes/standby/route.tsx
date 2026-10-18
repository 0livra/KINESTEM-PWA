import { useNavigate } from 'react-router';
import { LedAvatarSVG } from '../../components/led-avatar-svg';
import { ArcadeTitle } from '../../components/arcade-title';

/**
 * Pantalla fija de Protector de Pantalla (Standby).
 * Activa al presionar el botón B en el lobby, muestra el arte de los
 * personajes LED y el emblema de KINESTEM.
 */
export default function StandbyRoute() {
  const navigate = useNavigate();

  const handleTap = () => {
    navigate('/lobby');
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden select-none bg-halftone-navy bg-fixed"
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label="Toca para volver al Lobby"
    >
      <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
        {/* Galeria de personajes LED */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <LedAvatarSVG color="red" expression="wink" size={80} className="animate-float" />
          <LedAvatarSVG color="green" expression="smile" size={80} className="animate-float [animation-delay:0.3s]" />
          <LedAvatarSVG color="blue" expression="serious" size={80} className="animate-float [animation-delay:0.6s]" />
          <LedAvatarSVG color="orange" expression="dizzy" size={80} className="animate-float [animation-delay:0.9s]" />
          <LedAvatarSVG color="cream" expression="wink" size={80} className="animate-float [animation-delay:1.2s]" />
        </div>

        {/* Emblema KINESTEM */}
        <div className="text-center">
          <ArcadeTitle word="KINESTEM" className="text-4xl sm:text-5xl" />
          <p className="mt-4 font-display text-base font-extrabold uppercase tracking-widest text-white/90">
            Sistema de Aprendizaje STEM
          </p>
        </div>

        {/* Aviso claro */}
        <div className="mt-8 rounded-2xl border-4 border-ink bg-arcade-navy-deep px-6 py-4 shadow-[5px_5px_0px_#0F172A]">
          <p className="text-center font-display text-sm font-extrabold uppercase tracking-wide text-arcade-sky">
            Toca cualquier parte de la pantalla para volver al Lobby
          </p>
        </div>
      </div>
    </div>
  );
}
