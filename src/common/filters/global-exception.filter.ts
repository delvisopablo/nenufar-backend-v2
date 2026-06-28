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
  code?: string;
  fieldErrors?: Record<string, string>;
  fields?: Record<string, string | string[]>;
  [key: string]: unknown;
};
type RequestWithAuthContext = RequestWithContext &
  Request & {
    user?: {
      id?: number;
      sub?: number;
    };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFieldErrorsFromFields(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      const first = messages.find((message) => typeof message === 'string');
      if (first) {
        fieldErrors[field] = first;
      }
      continue;
    }

    if (typeof messages === 'string' && messages) {
      fieldErrors[field] = messages;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function normalizeFieldErrors(details: Record<string, unknown>) {
  const explicitFieldErrors = normalizeFieldErrorsFromFields(
    details.fieldErrors,
  );
  if (explicitFieldErrors) {
    return explicitFieldErrors;
  }

  return normalizeFieldErrorsFromFields(details.fields);
}

function detailsFromHttpResponse(response: string | NestErrorResponse) {
  if (typeof response === 'string') {
    return {};
  }

  if (Array.isArray(response.message)) {
    return { messages: response.message };
  }

  const {
    statusCode: _statusCode,
    message: _message,
    error: _error,
    code: _code,
    ...details
  } = response;

  return details;
}

function codeFromHttpResponse(
  status: number,
  response: string | NestErrorResponse,
) {
  if (typeof response !== 'string' && typeof response.code === 'string') {
    return response.code;
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'AUTH_ERROR';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    default:
      return `HTTP_${status}`;
  }
}

function mapHttpException(exception: HttpException): AppError {
  const status = exception.getStatus();
  const response = exception.getResponse() as string | NestErrorResponse;
  const message = messageFromHttpResponse(response);
  const details = detailsFromHttpResponse(response);
  const code = codeFromHttpResponse(status, response);

  if (typeof response !== 'string' && typeof response.code === 'string') {
    return new AppError(code, message, status, details);
  }

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
      return new AppError(code, message, status, details);
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

function getRequestUserId(req: RequestWithAuthContext) {
  const userId = Number(req.user?.id ?? req.user?.sub);

  return Number.isFinite(userId) && userId > 0 ? String(userId) : '-';
}

function getRequestPath(req: Request) {
  const rawPath = req.originalUrl ?? req.url ?? '/';
  return rawPath.split('?')[0] || '/';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithAuthContext>();
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

    const requestLine =
      `[ERR] ${req.method} ${getRequestPath(req)} ${appError.statusCode} ` +
      `rid=${requestId ?? '-'} user=${getRequestUserId(req)} ` +
      `code=${appError.code} msg=${appError.message}`;

    if (appError.statusCode >= 500) {
      StructuredLogger.error(requestLine, {
        stack:
          isDevelopment && exception instanceof Error
            ? exception.stack
            : undefined,
      });
    } else if (appError.statusCode >= 400) {
      StructuredLogger.warn(requestLine);
    }

    const fieldErrors = normalizeFieldErrors(appError.details);
    const errorPayload = {
      code: appError.code,
      message: appError.message,
      requestId,
      details: appError.details,
      ...(fieldErrors ? { fieldErrors } : {}),
    };

    res.status(appError.statusCode).json({
      ok: false,
      code: appError.code,
      message: appError.message,
      ...(fieldErrors ? { fieldErrors } : {}),
      error: errorPayload,
    });
  }
}
