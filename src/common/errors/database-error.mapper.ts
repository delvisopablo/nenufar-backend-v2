import { Prisma } from '@prisma/client';
import {
  AppError,
  ConflictError,
  ValidationError,
  createFieldError,
} from './app-error';

type DatabaseErrorLike = {
  code?: string;
  message?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
  meta?: Record<string, unknown>;
};

const CONNECTION_ERROR_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '57P01',
  '57P02',
  '57P03',
]);

function safeDetails(error: DatabaseErrorLike) {
  return {
    constraint: error.constraint,
    table: error.table,
    column: error.column,
    target: error.meta?.target,
    field: error.meta?.field_name,
    prismaCode: error.code?.startsWith('P') ? error.code : undefined,
    postgresCode:
      error.code && !error.code.startsWith('P') ? error.code : undefined,
  };
}

function clean(details: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined),
  );
}

function asTargetList(target: unknown) {
  if (Array.isArray(target)) {
    return target.map(String);
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
}

function targetIncludes(target: unknown, field: string) {
  return asTargetList(target).some((item) =>
    item.toLowerCase().includes(field.toLowerCase()),
  );
}

function textIncludes(value: unknown, term: string) {
  return String(value ?? '')
    .toLowerCase()
    .includes(term.toLowerCase());
}

function mapUniqueConstraint(details: Record<string, unknown>) {
  const target = details.target;
  const constraint = details.constraint;

  if (targetIncludes(target, 'email') || textIncludes(constraint, 'email')) {
    return createFieldError(
      'EMAIL_ALREADY_IN_USE',
      'Este correo ya está en uso.',
      'email',
      'Este correo ya está en uso.',
      409,
      details,
    );
  }

  if (
    targetIncludes(target, 'nickname') ||
    textIncludes(constraint, 'nickname')
  ) {
    return createFieldError(
      'NICKNAME_ALREADY_IN_USE',
      'Este nickname ya está en uso.',
      'nickname',
      'Este nickname ya está en uso.',
      409,
      details,
    );
  }

  const isListaNombreTarget =
    targetIncludes(target, 'usuarioId') && targetIncludes(target, 'nombre');
  const isListaNombreConstraint =
    textIncludes(constraint, 'listacompra') &&
    textIncludes(constraint, 'nombre');

  if (isListaNombreTarget || isListaNombreConstraint) {
    return createFieldError(
      'LIST_NAME_ALREADY_EXISTS',
      'Ya tienes una lista con ese nombre.',
      'nombre',
      'Ya tienes una lista con ese nombre.',
      409,
      details,
    );
  }

  return new ConflictError('Ya existe un registro con esos datos', details);
}

export function mapDatabaseError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    const details = clean(safeDetails(prismaError as DatabaseErrorLike));

    switch (prismaError.code) {
      case 'P2002':
        return mapUniqueConstraint({
          ...details,
          target: prismaError.meta?.target,
        });
      case 'P2003':
        return new AppError(
          'RELATED_RECORD_NOT_FOUND',
          'El negocio, producto o usuario indicado no existe.',
          400,
          details,
        );
      case 'P2011':
        return new ValidationError('Falta un campo obligatorio', details);
      case 'P1001':
        return new AppError(
          'DB_CONNECTION_ERROR',
          'No se pudo conectar con la base de datos',
          503,
          details,
        );
      case 'P1002':
      case 'P1008':
        return new AppError(
          'DB_TIMEOUT',
          'La base de datos tardó demasiado en responder',
          504,
          details,
        );
      case 'P2010':
      case 'P2009':
        return new AppError(
          'INVALID_DATABASE_QUERY',
          'Error ejecutando la consulta en base de datos',
          500,
          details,
        );
      case 'P2022':
        return new AppError(
          'DB_SCHEMA_MISMATCH',
          'La base de datos no coincide con el esquema esperado',
          500,
          details,
        );
      case 'P2025':
        return new AppError(
          'NOT_FOUND',
          'No se ha encontrado el recurso solicitado.',
          404,
          details,
        );
      default:
        return null;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      'DB_CONNECTION_ERROR',
      'No se pudo inicializar la conexión con la base de datos',
      503,
    );
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new AppError(
      'DB_ENGINE_ERROR',
      'El motor de base de datos falló inesperadamente',
      500,
    );
  }

  const pgError = error as DatabaseErrorLike;
  if (!pgError?.code) {
    return null;
  }

  const details = clean(safeDetails(pgError));

  switch (pgError.code) {
    case '23505':
      return mapUniqueConstraint(details);
    case '23503':
      return new AppError(
        'RELATED_RECORD_NOT_FOUND',
        'El negocio, producto o usuario indicado no existe.',
        400,
        details,
      );
    case '23502':
      return new ValidationError('Falta un campo obligatorio', details);
    case '57014':
      return new AppError(
        'DB_TIMEOUT',
        'La base de datos tardó demasiado en responder',
        504,
        details,
      );
    case '42601':
    case '42703':
    case '42P01':
      return new AppError(
        'INVALID_DATABASE_QUERY',
        'Error ejecutando la consulta en base de datos',
        500,
        details,
      );
    default:
      if (CONNECTION_ERROR_CODES.has(pgError.code)) {
        return new AppError(
          'DB_CONNECTION_ERROR',
          'No se pudo conectar con la base de datos',
          503,
          details,
        );
      }
      return null;
  }
}
