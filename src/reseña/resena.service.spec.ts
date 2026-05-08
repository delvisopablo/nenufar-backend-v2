/// <reference types="jest" />

import { ContenidoEstado } from '@prisma/client';
import { ResenaService } from './resena.service';

function buildResena(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    contenido: 'Muy bien',
    puntuacion: 5,
    estado: ContenidoEstado.PUBLICADO,
    moderadoEn: null,
    motivoModeracion: null,
    selloNenufar: false,
    usuarioId: 7,
    negocioId: 3,
    creadoEn: new Date('2026-05-08T10:00:00.000Z'),
    actualizadoEn: new Date('2026-05-08T10:00:00.000Z'),
    eliminadoEn: null,
    usuario: {
      id: 7,
      nombre: 'Ada',
      foto: null,
    },
    negocio: {
      id: 3,
      nombre: 'Cafe Demo',
      slug: 'cafe-demo',
      fotoPerfil: null,
      fotoPortada: null,
      nenufarColor: null,
      nenufarActivo: null,
      nenufarKey: null,
      nenufarAsset: null,
      categoria: {
        id: 1,
        nombre: 'Cafeteria',
      },
    },
    ...overrides,
  };
}

describe('ResenaService', () => {
  let service: ResenaService;
  let prisma: {
    $transaction: jest.Mock;
    resena: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    negocio: {
      findFirst: jest.Mock;
    };
    post: {
      create: jest.Mock;
    };
    usuario: {
      update: jest.Mock;
    };
    petaloTx: {
      create: jest.Mock;
    };
  };
  let notificaciones: {
    fanoutNegocio: jest.Mock;
  };
  let logroEngine: {
    registrarAccion: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      resena: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      negocio: {
        findFirst: jest.fn(),
      },
      post: {
        create: jest.fn(),
      },
      usuario: {
        update: jest.fn(),
      },
      petaloTx: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      Promise.resolve(
        callback({
          resena: prisma.resena,
          negocio: prisma.negocio,
          post: prisma.post,
          usuario: prisma.usuario,
          petaloTx: prisma.petaloTx,
        }),
      ),
    );

    notificaciones = {
      fanoutNegocio: jest.fn().mockResolvedValue(undefined),
    };

    logroEngine = {
      registrarAccion: jest.fn().mockResolvedValue(undefined),
    };

    service = new ResenaService(
      prisma as never,
      notificaciones as never,
      logroEngine as never,
    );
  });

  it('permite múltiples reseñas del mismo negocio para el mismo usuario', async () => {
    prisma.negocio.findFirst.mockResolvedValue({ duenoId: 50 });
    prisma.resena.create
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 102 });
    prisma.post.create
      .mockResolvedValueOnce({ id: 201 })
      .mockResolvedValueOnce({ id: 202 });
    prisma.usuario.update.mockResolvedValue({ petalosSaldo: 10 });
    prisma.petaloTx.create.mockResolvedValue({});
    prisma.resena.findUnique
      .mockResolvedValueOnce(buildResena({ id: 101 }))
      .mockResolvedValueOnce(buildResena({ id: 102 }));

    const dto = {
      negocioId: 3,
      puntuacion: 5,
      contenido: 'Muy bien',
    };

    const primera = await service.crear(7, dto);
    const segunda = await service.crear(7, dto);

    expect(primera).toEqual(
      expect.objectContaining({
        id: 101,
        negocioId: 3,
      }),
    );
    expect(segunda).toEqual(
      expect.objectContaining({
        id: 102,
        negocioId: 3,
      }),
    );
    expect(prisma.resena.create).toHaveBeenCalledTimes(2);
    expect(prisma.resena.create).toHaveBeenNthCalledWith(1, {
      data: {
        negocioId: 3,
        usuarioId: 7,
        puntuacion: 5,
        contenido: 'Muy bien',
        selloNenufar: false,
      },
      select: { id: true },
    });
    expect(primera).not.toHaveProperty('producto');
    expect(segunda).not.toHaveProperty('producto');
  });

  it('crea una reseña sin intentar asociar producto', async () => {
    prisma.negocio.findFirst.mockResolvedValue({ duenoId: 7 });
    prisma.resena.create.mockResolvedValue({ id: 301 });
    prisma.post.create.mockResolvedValue({ id: 401 });
    prisma.usuario.update.mockResolvedValue({ petalosSaldo: 15 });
    prisma.petaloTx.create.mockResolvedValue({});
    prisma.resena.findUnique.mockResolvedValue(buildResena({ id: 301 }));

    const result = await service.crear(7, {
      negocioId: 9,
      puntuacion: 4,
      contenido: 'Buen servicio',
    });

    expect(prisma.resena.create).toHaveBeenCalledWith({
      data: {
        negocioId: 9,
        usuarioId: 7,
        puntuacion: 4,
        contenido: 'Buen servicio',
        selloNenufar: false,
      },
      select: { id: true },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 301,
      }),
    );
    expect(result).not.toHaveProperty('producto');
  });

  it('omite producto en las reseñas por negocio', async () => {
    prisma.resena.findMany.mockResolvedValue([buildResena({ id: 501 })]);

    const result = await service.getResenasPorNegocio(3);

    expect(result).toEqual([
      expect.objectContaining({
        id: 501,
        comentario: 'Muy bien',
      }),
    ]);
    expect(result[0]).not.toHaveProperty('producto');
  });
});
