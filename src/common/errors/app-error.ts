export type ErrorDetails = Record<string, unknown>;

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: ErrorDetails;
  readonly isOperational = true;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    details: ErrorDetails = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Solicitud inválida', details: ErrorDetails = {}) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'No autenticado', details: ErrorDetails = {}) {
    super('AUTH_ERROR', message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No autorizado', details: ErrorDetails = {}) {
    super('FORBIDDEN', message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', details: ErrorDetails = {}) {
    super('NOT_FOUND', message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual', details: ErrorDetails = {}) {
    super('CONFLICT', message, 409, details);
  }
}
