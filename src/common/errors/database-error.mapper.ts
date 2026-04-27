import { Prisma } from '@prisma/client';
import { AppError, ConflictError, ValidationError } from './app-error';

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
    postgresCode: error.code && !error.code.startsWith('P') ? error.code : undefined,
  };
}

function clean(details: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined),
  );
}

export function mapDatabaseError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    const details = clean(safeDetails(prismaError as DatabaseErrorLike));

    switch (prismaError.code) {
      case 'P2002':
        return new ConflictError('Ya existe un registro con esos datos', {
          ...details,
          target: prismaError.meta?.target,
        });
      case 'P2003':
        return new ConflictError('La relación indicada no existe', details);
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
          'Registro no encontrado',
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
      return new ConflictError('Ya existe un registro con esos datos', details);
    case '23503':
      return new ConflictError('La relación indicada no existe', details);
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
