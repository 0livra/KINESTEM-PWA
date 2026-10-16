import { Outlet, Link, isRouteErrorResponse } from 'react-router';
import { useUserStore, useHardwareStore } from '../store';

export function HydrateFallback() {
  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', color: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Inicializando Consola KINESTEM...</h2>
        <p style={{ color: '#94A3B8' }}>Cargando módulos interactivos en memoria RAM...</p>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let errorMessage = 'Ocurrió un error inesperado en la aplicación.';
  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}: ${error.data}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#1E293B', color: '#EF4444', minHeight: '100vh' }}>
      <h1>Error en KINESTEM Gateway</h1>
      <pre style={{ backgroundColor: '#0F172A', padding: '1rem', borderRadius: '8px', color: '#FCA5A5' }}>
        {errorMessage}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        Reintentar conexión
      </button>
    </div>
  );
}

export default function RootLayout() {
  const { username, saldoPuntos } = useUserStore((s) => ({
    username: s.username,
    saldoPuntos: s.saldoPuntos,
  }));

  const { wsStatus, mock } = useHardwareStore((s) => ({
    wsStatus: s.wsStatus,
    mock: s.mock,
  }));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', color: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      {/* Barra de navegación superior KINESTEM */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundColor: '#1E293B', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#38BDF8', fontWeight: 'bold' }}>
            ⚡ KINESTEM CONSOLE
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/auth-pairing" style={{ color: '#94A3B8', textDecoration: 'none' }}>Emparejamiento</Link>
            <Link to="/lobby" style={{ color: '#94A3B8', textDecoration: 'none' }}>Lobby</Link>
            <Link to="/arena" style={{ color: '#94A3B8', textDecoration: 'none' }}>Arena 60FPS</Link>
            <Link to="/rewards-shop" style={{ color: '#94A3B8', textDecoration: 'none' }}>Tienda & Ruleta</Link>
            <Link to="/analytics" style={{ color: '#94A3B8', textDecoration: 'none' }}>Analíticas</Link>
          </nav>
        </div>

        {/* Indicadores de hardware y puntos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: wsStatus === 'connected' ? '#10B981' : '#F59E0B' }} />
            <span>Hardware: {mock ? 'Simulado (Mock)' : 'Arduino UNO'}</span>
          </div>

          <div style={{ backgroundColor: '#0F172A', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>⭐ {saldoPuntos} pts</span>
            {username && <span style={{ marginLeft: '0.5rem', color: '#94A3B8' }}>({username})</span>}
          </div>
        </div>
      </header>

      {/* Contenedor principal de rutas */}
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
