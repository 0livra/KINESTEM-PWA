import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

// Tipografía arcade (display chunky + UI legible)
import '@fontsource/baloo-2/400.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

// Sistema de diseño global (tokens arcade, halftone, animaciones)
import './app/styles/global.css';

import RootLayout, { HydrateFallback, RouteErrorBoundary } from './app/root';
import MainMenuRoute from './app/routes/main-menu/route';
import AuthPairingRoute, { clientLoader as authLoader } from './app/routes/auth-pairing/route';
import LobbyRoute, { clientLoader as lobbyLoader } from './app/routes/lobby/route';
import ArenaRoute from './app/routes/arena/route';
import StandbyRoute from './app/routes/standby/route';
import RewardsShopRoute, { clientLoader as shopLoader } from './app/routes/rewards-shop/route';
import AnalyticsRoute, { clientLoader as analyticsLoader } from './app/routes/analytics/route';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    HydrateFallback: HydrateFallback,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <MainMenuRoute />,
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
        path: 'standby',
        element: <StandbyRoute />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
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
