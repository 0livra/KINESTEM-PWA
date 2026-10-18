import { useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Coins, Gift, Package, Sparkles, Trophy } from 'lucide-react';
import { ConsoleTopBar } from '../../components/console-top-bar';
import { ArcadeButton } from '../../components/arcade-button';
import { PanelCard } from '../../components/panel-card';
import { GiftBoxMascot, LedMascot } from '../../components/led-mascot';
import { FourPointStar } from '../../components/sparkles';
import { useUserStore } from '../../../store';
import { sendDispenseCommand } from '../../hardware/gateway-client';
import { AsymmetricRoulette, ROULETTE_SECTORS, TOTAL_WEIGHT } from './asymmetric-roulette';
import type { Sector } from './asymmetric-roulette';

export interface ShopItem {
  id: number;
  nombre: string;
  descripcion: string;
  costo_puntos: number;
  stock: number;
  categoria: string;
}

export async function clientLoader() {
  // Carga concurrente del catalogo físico (evita cascadas de red)
  const [shopItemsRes] = await Promise.all([
    fetch('/api/v1/economy/recompensas').then((r) => r.json()).catch(() => ({
      data: [
        { id: 1, nombre: 'Kit de Resistencias STEM', descripcion: 'Pack de 20 resistencias de precision', costo_puntos: 150, stock: 8, categoria: 'fisico' },
        { id: 2, nombre: 'Modulo LED RGB', descripcion: 'Diodo tricolor para experimentos opticos', costo_puntos: 300, stock: 5, categoria: 'fisico' },
        { id: 3, nombre: 'Sticker KINESTEM Holografico', descripcion: 'Emblema coleccionable de maestria', costo_puntos: 50, stock: 50, categoria: 'souvenir' },
      ],
    })),
  ]);

  return { shopItems: (shopItemsRes.data as ShopItem[]) ?? [] };
}

type SpinOutcome =
  | { kind: 'points'; sector: Sector }
  | { kind: 'physical'; sector: Sector }
  | null;

export default function RewardsShopRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const navigate = useNavigate();
  const { saldoPuntos, updateSaldo } = useUserStore((s) => ({
    saldoPuntos: s.saldoPuntos,
    updateSaldo: s.updateSaldo,
  }));

  const [outcome, setOutcome] = useState<SpinOutcome>(null);
  const [redeemedItem, setRedeemedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!redeemedItem) return;
    const timer = setTimeout(() => setRedeemedItem(null), 3200);
    return () => clearTimeout(timer);
  }, [redeemedItem]);

  const handleSpinEnd = (winner: Sector) => {
    if (winner.rewardType === 'PHYSICAL_BOX') {
      // Único premio físico real: libera la caja con el Servo SG90
      sendDispenseCommand();
      setOutcome({ kind: 'physical', sector: winner });
      return;
    }
    // Sectores normales: solo suman puntos al saldo del jugador
    updateSaldo(winner.pointsValue);
    setOutcome({ kind: 'points', sector: winner });
  };

  const handleRedeem = (item: ShopItem) => {
    if (saldoPuntos < item.costo_puntos || item.stock === 0) return;
    updateSaldo(-item.costo_puntos);
    setRedeemedItem(item.nombre);
  };

  return (
    <div className="min-h-dvh bg-halftone-navy bg-fixed">
      <ConsoleTopBar
        title="Recompensas"
        subtitle="Ruleta Misteriosa y Tienda"
        onBack={() => navigate('/')}
        backLabel="Volver"
      />

      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        {/* Saldo actual */}
        <div className="mb-5 flex items-center justify-center gap-2 rounded-full border-4 border-ink bg-ink px-5 py-2 shadow-[4px_4px_0px_rgba(15,23,42,0.55)]">
          <Coins className="h-5 w-5 text-arcade-yellow" aria-hidden />
          <span className="font-display text-xl font-extrabold tabular-nums text-arcade-yellow">
            {saldoPuntos}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">puntos</span>
        </div>

        {/* Ruleta SVG asimétrica (premio físico exacto 1/6) */}
        <PanelCard tone="ink" icon={Sparkles} title="Ruleta de la Caja" className="relative animate-pop-in">
          <FourPointStar className="absolute right-3 top-3 h-5 w-5" />
          <AsymmetricRoulette onSpinEnd={handleSpinEnd} />

          <p className="mt-4 text-center text-[10px] font-bold uppercase leading-relaxed tracking-widest text-slate-400">
            Sector fisico: {TOTAL_WEIGHT > 0 ? Math.round((10 / TOTAL_WEIGHT) * 10000) / 100 : 0}% del disco ·
            Los demas sectores suman puntos
          </p>

          {outcome?.kind === 'points' ? (
            <div
              role="status"
              className="animate-pop-in mt-4 flex items-center gap-3 rounded-xl border-[3px] border-ink bg-arcade-emerald p-3 text-ink shadow-[4px_4px_0px_#0F172A]"
            >
              <Trophy className="h-8 w-8 shrink-0" aria-hidden />
              <p className="font-display text-base font-extrabold uppercase leading-tight tracking-wide">
                {outcome.sector.label} agregados
                <span className="mt-0.5 block text-[10px] font-bold tracking-widest opacity-80">
                  Tu saldo ahora es {saldoPuntos} puntos
                </span>
              </p>
            </div>
          ) : null}

          {outcome?.kind === 'physical' ? (
            <div
              role="status"
              className="animate-pop-in mt-4 rounded-xl border-[3px] border-ink bg-arcade-magenta p-3 text-white shadow-[4px_4px_0px_#0F172A]"
            >
              <div className="flex items-center gap-3">
                <GiftBoxMascot face="cheer" className="h-16 w-16 shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold uppercase leading-tight tracking-wide">
                    Caja fisica liberada
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest opacity-90">
                    Senal DISPENSE enviada al Servo SG90 · Reclama tu premio en el dispensador
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border-2 border-ink bg-ink/85 py-1.5">
                <LedMascot color="yellow" face="cheer" className="h-10 w-10" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-arcade-yellow">
                  La matriz LED celebra tu premio
                </span>
              </div>
            </div>
          ) : null}
        </PanelCard>

        {/* Catalogo de premios fisicos canjeables */}
        <div className="mt-7">
          <h2 className="panel-title-extrusion mb-3 flex items-center gap-2 font-display text-lg font-extrabold uppercase tracking-wide text-white">
            <Package className="h-5 w-5 text-arcade-sky" aria-hidden />
            Catalogo de Componentes
          </h2>

          <div className="grid gap-4">
            {data.shopItems.map((item) => {
              const affordable = saldoPuntos >= item.costo_puntos && item.stock > 0;
              return (
                <PanelCard key={item.id} tone="yellow" className="animate-pop-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-extrabold uppercase leading-tight tracking-wide">
                        {item.nombre}
                      </h3>
                      <p className="mt-0.5 text-xs font-bold leading-snug opacity-80">{item.descripcion}</p>
                      <p
                        className={`mt-1.5 inline-block rounded-md border-2 border-ink px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
                          item.stock > 0 ? 'bg-arcade-emerald text-ink' : 'bg-arcade-red text-white'
                        }`}
                      >
                        {item.stock > 0 ? `Stock: ${item.stock} u.` : 'Agotado'}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="flex items-center gap-1 font-display text-lg font-extrabold text-ink">
                        <Coins className="h-4 w-4" aria-hidden />
                        {item.costo_puntos}
                      </span>
                      <ArcadeButton
                        variant={affordable ? 'blue' : 'dark'}
                        size="sm"
                        icon={Gift}
                        disabled={!affordable}
                        onClick={() => handleRedeem(item)}
                      >
                        Canjear
                      </ArcadeButton>
                    </div>
                  </div>
                </PanelCard>
              );
            })}
          </div>

          {redeemedItem ? (
            <div
              role="status"
              className="animate-pop-in fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-xl border-[3px] border-ink bg-arcade-emerald px-4 py-3 text-center font-display text-sm font-extrabold uppercase tracking-wide text-ink shadow-[4px_4px_0px_#0F172A]"
            >
              Canje exitoso: {redeemedItem}
            </div>
          ) : null}

          {data.shopItems.length === 0 ? (
            <PanelCard tone="navy">
              <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-300">
                Catalogo no disponible temporalmente
              </p>
            </PanelCard>
          ) : null}
        </div>

        {/* Leyenda de sectores (sin emojis, solo geometria) */}
        <PanelCard tone="navy" className="mt-7">
          <h3 className="mb-2 font-display text-sm font-extrabold uppercase tracking-widest text-arcade-yellow">
            Sectores del disco
          </h3>
          <ul className="grid gap-1.5">
            {ROULETTE_SECTORS.map((sector) => (
              <li key={sector.id} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-200">
                <span
                  className="h-3.5 w-3.5 rounded-sm border-2 border-ink"
                  style={{ backgroundColor: sector.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{sector.label}</span>
                <span className="tabular-nums text-slate-400">
                  {Math.round((sector.weight / TOTAL_WEIGHT) * 10000) / 100}%
                </span>
              </li>
            ))}
          </ul>
        </PanelCard>
      </main>
    </div>
  );
}
