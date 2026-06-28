import { BadRequestException } from '@nestjs/common';
import { LogroService } from './logro.service';

describe('LogroService', () => {
  let service: LogroService;
  let prisma: {
    $transaction: jest.Mock;
    logroUsuario: {
      findMany: jest.Mock;
    };
    usuarioLogroDestacado: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
    negocio: {
      findFirst: jest.Mock;
    };
    logro: {
      findMany: jest.Mock;
    };
  };
  let logroEngine: {
    getContadorAccionNegocio: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      logroUsuario: {
        findMany: jest.fn(),
      },
      usuarioLogroDestacado: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      negocio: {
        findFirst: jest.fn(),
      },
      logro: {
        findMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation((input: unknown) => {
      if (typeof input === 'function') {
        return input({
          usuarioLogroDestacado: prisma.usuarioLogroDestacado,
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    });

    logroEngine = {
      getContadorAccionNegocio: jest.fn(),
    };

    service = new LogroService(prisma as never, logroEngine as never);
  });

  it('reemplaza destacados solo con logros desbloqueados y posiciones 1-3', async () => {
    prisma.logroUsuario.findMany.mockResolvedValue([
      { logroId: 1 },
      { logroId: 5 },
    ]);
    prisma.usuarioLogroDestacado.findMany.mockResolvedValue([]);

    await service.actualizarLogrosDestacados(9, [1, 5]);

    expect(prisma.usuarioLogroDestacado.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: 9 },
    });
    expect(prisma.usuarioLogroDestacado.createMany).toHaveBeenCalledWith({
      data: [
        { usuarioId: 9, logroId: 1, posicion: 1 },
        { usuarioId: 9, logroId: 5, posicion: 2 },
      ],
    });
  });

  it('rechaza destacados bloqueados o inexistentes', async () => {
    prisma.logroUsuario.findMany.mockResolvedValue([{ logroId: 1 }]);

    await expect(
      service.actualizarLogrosDestacados(9, [1, 99]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('en vista visitante de negocio solo muestra logros conseguidos sin progreso privado', async () => {
    const conseguidoEn = new Date('2026-06-26T10:00:00.000Z');
    prisma.negocio.findFirst.mockResolvedValue({ id: 3, duenoId: 9 });
    prisma.logro.findMany.mockResolvedValue([
      {
        id: 11,
        titulo: 'Primer aplauso recibido',
        descripcion: 'Recibe la primera reseña publicada en tu negocio.',
        tipo: 'RESENA',
        categoriaLogro: 'NEGOCIO',
        oculto: false,
        esFinal: false,
        accion: 'NEGOCIO_RECIBIR_RESENAS',
        dificultad: 'FACIL',
        umbral: 5,
        recompensaPuntos: 30,
        logrosNegocio: [
          {
            id: 1,
            progreso: 2,
            conseguido: false,
            conseguidoEn: null,
            actualizadoEn: new Date('2026-06-26T09:00:00.000Z'),
          },
        ],
      },
      {
        id: 12,
        titulo: 'Escaparate con oferta',
        descripcion: 'Crea tu primera promoción para clientes locales.',
        tipo: 'PROMOCION',
        categoriaLogro: 'NEGOCIO',
        oculto: false,
        esFinal: false,
        accion: 'NEGOCIO_CREAR_PROMOCIONES',
        dificultad: 'FACIL',
        umbral: 1,
        recompensaPuntos: 25,
        logrosNegocio: [
          {
            id: 2,
            progreso: 1,
            conseguido: true,
            conseguidoEn,
            actualizadoEn: conseguidoEn,
          },
        ],
      },
    ]);
    logroEngine.getContadorAccionNegocio
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await service.logrosPorNegocio(3);

    expect(result).toEqual(
      expect.objectContaining({
        negocioId: 3,
        acceso: 'VISITANTE',
        totalLogros: 2,
        logrosConseguidos: 1,
      }),
    );
    expect(result.logros).toEqual([
      expect.objectContaining({
        id: 12,
        progresoActual: 1,
        progresoPorcentaje: 100,
        desbloqueado: true,
      }),
    ]);
  });
});
