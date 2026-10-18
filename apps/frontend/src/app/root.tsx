import { Outlet, isRouteErrorResponse } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { BottomStatusBar } from './components/bottom-status-bar';
import { ArcadeButton } from './components/arcade-button';
import { ArcadeTitle } from './components/arcade-title';
import { LedMascot } from './components/led-mascot';
import { useHardwareGateway } from './hooks/use-hardware-gateway';

export function HydrateFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-halftone-ink">
      <LedMascot color="blue" face="waiting" className="h-28 w-28 animate-float" />
      <ArcadeTitle word="KINESTEM" className="text-4xl" />
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
        Inicializando consola portatil...
      </p>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let errorMessage = 'Ocurrio un error inesperado en la aplicacion.';
  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}: ${error.data}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-halftone-ink px-4">
      <div className="w-full max-w-md rounded-2xl border-4 border-ink bg-arcade-red p-5 text-white shadow-[6px_6px_0px_#0F172A]">
        <div className="flex items-center gap-3">
          <TriangleAlert className="h-10 w-10 shrink-0" aria-hidden />
          <h1 className="panel-title-extrusion font-display text-xl font-extrabold uppercase leading-tight tracking-wide">
            Error del sistema
          </h1>
        </div>
        <pre className="mt-3 max-h-40 overflow-auto rounded-xl border-2 border-ink bg-ink p-3 font-mono text-xs text-arcade-red">
          {errorMessage}
        </pre>
        <ArcadeButton variant="yellow" block className="mt-4" onClick={() => window.location.reload()}>
          Reintentar conexion
        </ArcadeButton>
      </div>
    </div>
  );
}

export default function RootLayout() {
  // Mantiene la conexión WebSocket con el gateway de hardware durante toda la sesión
  useHardwareGateway();

  return (
    <div className="min-h-dvh">
      <Outlet />
      <BottomStatusBar />
    </div>
  );
}
