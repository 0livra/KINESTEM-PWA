import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import { env } from './config/env';
import { helmetMiddleware, sanitizeMiddleware } from './shared/middlewares/security.middleware';
import { rateLimiter } from './shared/middlewares/rate-limiter.middleware';
import { errorMiddleware, NotFoundError } from './shared/middlewares/error.middleware';
import { authUsersRoutes } from './modules/auth-users/auth-users.routes';
import { matchesRoutes } from './modules/matches/matches.routes';
import { economyRewardsRoutes } from './modules/economy-rewards/economy-rewards.routes';
import { telemetryRoutes } from './modules/telemetry/telemetry.routes';
import { postgresService } from './config/postgres';
import { mongoService } from './config/mongo';
import { serialService } from './modules/hardware-gateway/serial.service';

export function createApp(): Application {
  const app: Application = express();

  app.use(helmetMiddleware);
  app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }));

  // Parsers con límite 16kb anti-DoS
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));

  // Sanitización NoSQL + Prototype Pollution
  app.use(sanitizeMiddleware);

  // Sesión con cookie ofuscada y flags de seguridad estrictos
  app.use(session({
    name: 'app_session_id',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    },
  }));

  app.use(rateLimiter.middleware);

  app.get('/ping', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'kinestem-backend', timestamp: Date.now() });
  });

  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    const [pgOk, mongoOk] = await Promise.all([postgresService.healthcheck(), mongoService.healthcheck()]);
    res.json({ status: 'running', postgres: { connected: pgOk }, mongo: { connected: mongoOk }, serial: serialService.getStatus(), timestamp: Date.now() });
  });

  app.use('/api/v1/auth', authUsersRoutes);
  app.use('/api/v1/matches', matchesRoutes);
  app.use('/api/v1/economy', economyRewardsRoutes);
  app.use('/api/v1/telemetry', telemetryRoutes);

  app.use((_req, _res, next) => next(new NotFoundError()));
  app.use(errorMiddleware);

  return app;
}
