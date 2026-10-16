import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import RootLayout, { HydrateFallback, ErrorBoundary } from './app/root';
import AuthPairingRoute, { clientLoader as authLoader } from './app/routes/auth-pairing/route';
import LobbyRoute, { clientLoader as lobbyLoader } from './app/routes/lobby/route';
import ArenaRoute from './app/routes/arena/route';
import RewardsShopRoute, { clientLoader as shopLoader } from './app/routes/rewards-shop/route';
import AnalyticsRoute, { clientLoader as analyticsLoader } from './app/routes/analytics/route';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    HydrateFallback: HydrateFallback,
    errorElement: <ErrorBoundary error={new Error('Error en aplicación')} />,
    children: [
      {
        index: true,
        loader: authLoader,
        element: <AuthPairingRoute />,
      },
      {
        path: 'auth-pairing',
        loader: authLoader,
        element: <AuthPairingRoute />,
      },
      {
        path: 'lobby',
        loader: lobbyLoader,
        element: <LobbyRoute />,
      },
      {
        path: 'arena',
        element: <ArenaRoute />,
      },
      {
        path: 'rewards-shop',
        loader: shopLoader,
        element: <RewardsShopRoute />,
      },
      {
        path: 'analytics',
        loader: analyticsLoader,
        element: <AnalyticsRoute />,
      },
    ],
  },
]);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
