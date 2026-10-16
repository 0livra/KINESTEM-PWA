import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { sanitizeObjectKeys, sanitizeNoSqlOperators } from '../utils/safe-object.util';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', '*'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  xPoweredBy: false,
});

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSqlOperators(sanitizeObjectKeys(req.body));
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSqlOperators(sanitizeObjectKeys(req.query)) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSqlOperators(sanitizeObjectKeys(req.params)) as typeof req.params;
  }
  next();
}
