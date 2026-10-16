import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') { super(message, 404); }
}
export class ValidationError extends AppError {
  constructor(message = 'Datos de entrada inválidos') { super(message, 400); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') { super(message, 401); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual del recurso') { super(message, 409); }
}
export class InsufficientFundsError extends AppError {
  constructor(message = 'Saldo de puntos insuficiente') { super(message, 422); }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: 'Error de validación', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }
  console.error('[Server] Error no controlado:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
}
