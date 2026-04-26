import { NextFunction, Response } from 'express';
import { StructuredLogger } from '../logger/structured-logger';
import { RequestWithContext } from './request-context.middleware';

export function httpLoggingMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    StructuredLogger.log(level, 'http_request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl ?? req.url,
      statusCode,
      errorCode: res.locals.errorCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}
