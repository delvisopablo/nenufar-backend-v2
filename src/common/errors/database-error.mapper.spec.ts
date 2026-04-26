import { mapDatabaseError } from './database-error.mapper';

describe('mapDatabaseError', () => {
  it('mapea unique violation de PostgreSQL a 409', () => {
    const result = mapDatabaseError({
      code: '23505',
      constraint: 'Usuario_email_key',
      table: 'Usuario',
    });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'CONFLICT',
        statusCode: 409,
        message: 'Ya existe un registro con esos datos',
      }),
    );
  });

  it('mapea foreign key violation de PostgreSQL a 409', () => {
    const result = mapDatabaseError({
      code: '23503',
      constraint: 'Reserva_usuarioId_fkey',
    });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'CONFLICT',
        statusCode: 409,
        message: 'La relación indicada no existe',
      }),
    );
  });

  it('mapea not null violation de PostgreSQL a 400', () => {
    const result = mapDatabaseError({
      code: '23502',
      column: 'email',
    });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: 'Falta un campo obligatorio',
      }),
    );
  });

  it('mapea timeout de PostgreSQL a 504', () => {
    const result = mapDatabaseError({ code: '57014' });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'DB_TIMEOUT',
        statusCode: 504,
      }),
    );
  });

  it('mapea query inválida de PostgreSQL a 500', () => {
    const result = mapDatabaseError({ code: '42703', column: 'actualizadoEn' });

    expect(result).toEqual(
      expect.objectContaining({
        code: 'INVALID_DATABASE_QUERY',
        statusCode: 500,
      }),
    );
  });
});
