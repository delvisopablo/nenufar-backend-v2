import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { StructuredLogger } from '../logger/structured-logger';
import { RequestWithContext } from '../middleware/request-context.middleware';

type RequestWithAuth = RequestWithContext &
  Request & {
    user?: {
      id?: number;
      sub?: number;
    };
  };

function getRequestUserId(req: RequestWithAuth) {
  const userId = Number(req.user?.id ?? req.user?.sub);
  return Number.isFinite(userId) && userId > 0 ? String(userId) : '-';
}

function getRequestPath(req: RequestWithAuth) {
  const rawPath = req.originalUrl ?? req.url ?? req.path ?? '/';
  return rawPath.split('?')[0] || '/';
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithAuth>();
    const res = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();

    res.once('finish', () => {
      const durationMs = Math.round(
        Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      );

      StructuredLogger.info(
        `[REQ] ${req.method} ${getRequestPath(req)} ${res.statusCode} ${durationMs}ms rid=${req.requestId ?? '-'} user=${getRequestUserId(req)}`,
      );
    });

    return next.handle();
  }
}
