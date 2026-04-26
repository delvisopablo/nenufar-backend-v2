import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AppError,
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/app-error';
import { mapDatabaseError } from '../errors/database-error.mapper';
import { StructuredLogger } from '../logger/structured-logger';
import { RequestWithContext } from '../middleware/request-context.middleware';

type NestErrorResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

function messageFromHttpResponse(response: string | NestErrorResponse) {
  if (typeof response === 'string') {
    return response;
  }

  if (Array.isArray(response.message)) {
    return 'Datos de entrada inválidos';
  }

  return response.message ?? response.error ?? 'Error HTTP';
}

function detailsFromHttpResponse(response: string | NestErrorResponse) {
  if (typeof response === 'string' || !Array.isArray(response.message)) {
    return {};
  }

  return { messages: response.message };
}

function mapHttpException(exception: HttpException): AppError {
  const status = exception.getStatus();
  const response = exception.getResponse() as string | NestErrorResponse;
  const message = messageFromHttpResponse(response);
  const details = detailsFromHttpResponse(response);

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return new ValidationError(message, details);
    case HttpStatus.UNAUTHORIZED:
      return new AuthError(message);
    case HttpStatus.FORBIDDEN:
      return new ForbiddenError(message);
    case HttpStatus.NOT_FOUND:
      return new NotFoundError(message);
    case HttpStatus.CONFLICT:
      return new ConflictError(message);
    default:
      return new AppError(`HTTP_${status}`, message, status, details);
  }
}

function normalizeException(exception: unknown): AppError {
  if (exception instanceof AppError) {
    return exception;
  }

  const databaseError = mapDatabaseError(exception);
  if (databaseError) {
    return databaseError;
  }

  if (exception instanceof HttpException) {
    return mapHttpException(exception);
  }

  return new AppError('INTERNAL_ERROR', 'Error interno del servidor', 500);
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithContext & Request>();
    const res = ctx.getResponse<Response>();
    const appError = normalizeException(exception);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const requestId =
      req.requestId ??
      req.header('x-request-id') ??
      (res.getHeader('x-request-id') as string | undefined);

    res.locals.errorCode = appError.code;
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }

    StructuredLogger.error(appError.message, {
      requestId,
      method: req.method,
      path: req.originalUrl ?? req.url,
      statusCode: appError.statusCode,
      errorCode: appError.code,
      message: appError.message,
      details: appError.details,
      stack:
        isDevelopment && exception instanceof Error ? exception.stack : undefined,
    });

    res.status(appError.statusCode).json({
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        requestId,
        details: appError.details,
      },
    });
  }
}
