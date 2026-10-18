import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BarChart3, Nfc, Zap } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeTitle } from '../../components/arcade-title';
import { FolderModeCard } from '../../components/folder-mode-card';
import { CapacitorMascot, ChipMascot, GiftBoxMascot, LedMascot } from '../../components/led-mascot';
import { DiamondSparkle, FourPointStar, MiniHeartSparkle } from '../../components/sparkles';
import { useHardwareStore } from '../../../store';

interface ModeCardConfig {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  tone: 'magenta' | 'amber' | 'sky' | 'emerald';
  rotate: number;
  target: string;
  requiresStation: boolean;
  featured?: boolean;
}

const MODE_CARDS: ModeCardConfig[] = [
  {
    id: 'arena',
    tag: 'Historia',
    title: 'Modo Supervivencia',
    subtitle: 'Arena STEM · Jugar Partida',
    tone: 'magenta',
    rotate: -4,
    target: '/lobby',
    requiresStation: true,
    featured: true,
  },
  {
    id: 'pairing',
    tag: 'Estación Física',
    title: 'Vinculación IR + RFID',
    subtitle: 'Emparejar consola',
    tone: 'amber',
    rotate: 3,
    target: '/auth-pairing',
    requiresStation: false,
  },
  {
    id: 'roulette',
    tag: 'Recompensas',
    title: 'Caja Misteriosa',
    subtitle: 'Ruleta de premios',
    tone: 'sky',
    rotate: -2,
    target: '/rewards-shop',
    requiresStation: true,
  },
  {
    id: 'analytics',
    tag: 'Resultados',
    title: 'Telemetría STEM',
    subtitle: 'Estadísticas y progreso',
    tone: 'emerald',
    rotate: 4,
    target: '/analytics',
    requiresStation: false,
  },
];

function CardIllustration({ cardId }: { cardId: string }) {
  switch (cardId) {
    case 'arena':
      return (
        <div className="flex items-end justify-center -space-x-3">
          <LedMascot color="red" face="happy" className="h-16 w-16 drop-shadow-[2px_2px_0px_rgba(15,23,42,0.35)]" />
          <LedMascot color="green" face="cheer" className="h-20 w-20 drop-shadow-[2px_2px_0px_rgba(15,23,42,0.35)]" />
          <LedMascot color="blue" face="wink" className="h-16 w-16 drop-shadow-[2px_2px_0px_rgba(15,23,42,0.35)]" />
        </div>
      );
    case 'pairing':
      return (
        <div className="flex items-center justify-center gap-2">
          <LedMascot color="blue" face="waiting" className="h-16 w-16" />
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-white/90">
            <Nfc className="h-6 w-6 text-ink" aria-hidden />
          </span>
        </div>
      );
    case 'roulette':
      return <GiftBoxMascot face="wink" className="h-20 w-20 animate-float" />;
    case 'analytics':
      return (
        <div className="flex items-center justify-center gap-2">
          <ChipMascot face="happy" className="h-16 w-16" />
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-white/90">
            <BarChart3 className="h-6 w-6 text-ink" aria-hidden />
          </span>
        </div>
      );
    default:
      return <CapacitorMascot face="confused" className="h-16 w-16" />;
  }
}

export default function MainMenuRoute() {
  const navigate = useNavigate();
  const { linked, linkedUsername, wsStatus } = useHardwareStore((s) => ({
    linked: s.linked,
    linkedUsername: s.linkedUsername,
    wsStatus: s.wsStatus,
  }));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), 2600);
    return () => clearTimeout(timer);
  }, [hint]);

  const activateCard = useCallback(
    (card: ModeCardConfig) => {
      setSelectedId(card.id);
      if (card.requiresStation && !linked) {
        setHint('Cartucho bloqueado: vincula primero la Estación Física (IR + RFID)');
        return;
      }
      navigate(card.target);
    },
    [linked, navigate]
  );

  const handleSelectButton = useCallback(() => {
    const card = MODE_CARDS.find((c) => c.id === selectedId);
    if (!card) {
      setHint('Toca una tarjeta del tablero para seleccionarla');
      return;
    }
    activateCard(card);
  }, [activateCard, selectedId]);

  return (
    <div className="min-h-dvh bg-halftone-navy bg-fixed">
      <ConsoleTopBar
        title="Kinestem"
        subtitle="Consola Portátil STEM"
        onSelect={handleSelectButton}
        selectLabel="Seleccionar"
      />

      <main className="mx-auto w-full max-w-md overflow-x-clip px-4 pb-32 pt-8">
        {/* Wordmark con destellos del logo oficial */}
        <div className="relative mb-2 flex flex-col items-center">
          <FourPointStar className="absolute -left-1 top-2 h-6 w-6 animate-float" />
          <DiamondSparkle className="absolute -right-2 top-6 h-5 w-5 animate-float [animation-delay:0.6s]" />
          <MiniHeartSparkle className="absolute right-6 -top-1 h-4 w-4 animate-float [animation-delay:1.1s]" />
          <ArcadeTitle word="KINESTEM" className="text-[2.6rem] sm:text-5xl" />
          <p className="mt-3 rounded-full border-[3px] border-ink bg-arcade-yellow px-4 py-1 font-display text-[11px] font-extrabold uppercase tracking-[0.25em] text-ink shadow-[3px_3px_0px_#0F172A]">
            Elige tu cartucho
          </p>
        </div>

        {/* Estado de la estación */}
        <div className="mb-6 mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/85">
          <Zap className={`h-3.5 w-3.5 ${linked ? 'text-arcade-emerald' : 'text-slate-400'}`} aria-hidden />
          <span>
            Estación: {linked ? `Vinculada${linkedUsername ? ` · ${linkedUsername}` : ''}` : 'Sin vincular'} ·
            Gateway {wsStatus === 'connected' ? 'en línea' : wsStatus === 'connecting' ? 'conectando' : 'desconectado'}
          </span>
        </div>

        {/* Cartucho destacada: Modo Supervivencia */}
        <div className="mb-6 mt-4">
          <FolderModeCard
            {...MODE_CARDS[0]!}
            locked={MODE_CARDS[0]!.requiresStation && !linked}
            selected={selectedId === MODE_CARDS[0]!.id}
            onSelect={() => activateCard(MODE_CARDS[0]!)}
          >
            <CardIllustration cardId="arena" />
          </FolderModeCard>
        </div>

        {/* Cartuchos secundarios */}
        <div className="grid grid-cols-2 gap-5">
          {MODE_CARDS.slice(1, 3).map((card) => (
            <FolderModeCard
              key={card.id}
              {...card}
              locked={card.requiresStation && !linked}
              selected={selectedId === card.id}
              onSelect={() => activateCard(card)}
            >
              <CardIllustration cardId={card.id} />
            </FolderModeCard>
          ))}
        </div>

        <div className="mt-6">
          <FolderModeCard
            {...MODE_CARDS[3]!}
            locked={false}
            selected={selectedId === MODE_CARDS[3]!.id}
            onSelect={() => activateCard(MODE_CARDS[3]!)}
          >
            <CardIllustration cardId="analytics" />
          </FolderModeCard>
        </div>
      </main>

      {/* Aviso flotante de bloqueo / selección */}
      {hint ? (
        <div
          role="status"
          className="animate-pop-in fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-xl border-[3px] border-ink bg-arcade-red px-4 py-3 text-center font-display text-sm font-extrabold uppercase tracking-wide text-white shadow-[4px_4px_0px_#0F172A]"
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
