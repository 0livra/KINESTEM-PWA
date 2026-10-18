import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/main-menu/route.tsx'),
  route('auth-pairing', 'routes/auth-pairing/route.tsx'),
  route('lobby', 'routes/lobby/route.tsx'),
  route('arena', 'routes/arena/route.tsx'),
  route('rewards-shop', 'routes/rewards-shop/route.tsx'),
  route('analytics', 'routes/analytics/route.tsx'),
] satisfies RouteConfig;
