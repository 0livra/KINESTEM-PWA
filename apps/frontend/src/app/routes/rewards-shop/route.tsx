import { useState } from 'react';
import { useLoaderData } from 'react-router';
import { RouletteWheel, RouletteSegment } from './roulette-wheel';
import { useUserStore } from '../../../store';

export interface ShopItem {
  id: number;
  nombre: string;
  descripcion: string;
  costo_puntos: number;
  stock: number;
  categoria: string;
}

export async function clientLoader() {
  // Evitar cascada de red (waterfalls) combinando peticiones de tienda y ruleta con Promise.all
  const [shopItemsRes, rouletteItemsRes] = await Promise.all([
    fetch('/api/v1/economy/items').then((r) => r.json()).catch(() => ({
      data: [
        { id: 1, nombre: 'Kit de Resistencias STEM', descripcion: 'Pack de 20 resistencias de precisión', costo_puntos: 150, stock: 8, categoria: 'fisico' },
        { id: 2, nombre: 'Módulo LED RGB', descripcion: 'Diodo tricolor para experimentos ópticos', costo_puntos: 300, stock: 5, categoria: 'fisico' },
        { id: 3, nombre: 'Sticker KINESTEM Holográfico', descripcion: 'Emblema coleccionable de maestría', costo_puntos: 50, stock: 50, categoria: 'souvenir' },
      ],
    })),
    fetch('/api/v1/economy/roulette').then((r) => r.json()).catch(() => ({
      data: [
        { id: 1, titulo: '+20 Puntos', peso_probabilidad: 40, tipo_premio: 'puntos', valor_premio: 20, color_hex: '#3B82F6' },
        { id: 2, titulo: '+50 Puntos', peso_probabilidad: 30, tipo_premio: 'puntos', valor_premio: 50, color_hex: '#10B981' },
        { id: 3, titulo: '+100 Puntos', peso_probabilidad: 15, tipo_premio: 'puntos', valor_premio: 100, color_hex: '#F59E0B' },
        { id: 4, titulo: 'Premio Físico', peso_probabilidad: 5, tipo_premio: 'item', valor_premio: 1, color_hex: '#8B5CF6' },
        { id: 5, titulo: 'Intenta de nuevo', peso_probabilidad: 10, tipo_premio: 'puntos', valor_premio: 0, color_hex: '#EF4444' },
      ],
    })),
  ]);

  return {
    shopItems: (shopItemsRes.data as ShopItem[]) || [],
    rouletteSegments: (rouletteItemsRes.data as RouletteSegment[]) || [],
  };
}

export default function RewardsShopRoute() {
  const data = useLoaderData<typeof clientLoader>();
  const { saldoPuntos, updateSaldo } = useUserStore((s) => ({
    saldoPuntos: s.saldoPuntos,
    updateSaldo: s.updateSaldo,
  }));

  const [spinResult, setSpinResult] = useState<string | null>(null);

  const handleRedeem = (item: ShopItem) => {
    if (saldoPuntos < item.costo_puntos) {
      alert('Puntos insuficientes para canjear este premio.');
      return;
    }
    updateSaldo(-item.costo_puntos);
    alert(`¡Felicidades! Has canjeado "${item.nombre}". Reclámalo en el dispensador.`);
  };

  const handleSpinEnd = (winner: RouletteSegment) => {
    setSpinResult(`¡Ganaste: ${winner.titulo}!`);
    if (winner.tipo_premio === 'puntos' && winner.valor_premio > 0) {
      updateSaldo(winner.valor_premio);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', margin: 0 }}>Tienda de Premios Físicos & Ruleta STEM</h2>
        <p style={{ color: '#94A3B8' }}>
          Canjea tus puntos acumulados por componentes electrónicos reales o gira la ruleta.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
        {/* Catálogo de Premios Físicos */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: '#F8FAFC' }}>Catálogo de Componentes</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {data.shopItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem',
                  backgroundColor: '#1E293B',
                  borderRadius: 10,
                  border: '1px solid #334155',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.nombre}</h4>
                  <p style={{ margin: '0.25rem 0 0.5rem 0', color: '#94A3B8', fontSize: '0.875rem' }}>
                    {item.descripcion}
                  </p>
                  <span style={{ fontSize: '0.8rem', color: item.stock > 0 ? '#34D399' : '#EF4444' }}>
                    Stock disponible: {item.stock} unidades
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    ⭐ {item.costo_puntos} pts
                  </div>
                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={saldoPuntos < item.costo_puntos || item.stock === 0}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: saldoPuntos >= item.costo_puntos ? '#3B82F6' : '#475569',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 'bold',
                      cursor: saldoPuntos >= item.costo_puntos ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Canjear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sección Lateral: Ruleta Algorítmica */}
        <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: 12, border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Ruleta de la Fortuna</h3>
          <RouletteWheel segments={data.rouletteSegments} onSpinEnd={handleSpinEnd} />

          {spinResult && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#064E3B',
                color: '#34D399',
                borderRadius: 8,
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {spinResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
