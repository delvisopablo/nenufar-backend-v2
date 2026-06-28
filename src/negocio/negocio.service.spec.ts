import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContenidoEstado, EstadoCuenta, ReservaEstado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LogroEngineService } from '../logro/logro-engine.service';
import { NegocioService } from './negocio.service';

describe('NegocioService', () => {
  let service: NegocioService;
  let prisma: {
    $transaction: jest.Mock;
    negocio: {
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    promocion: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    post: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    reserva: {
      updateMany: jest.Mock;
    };
    resena: {
      aggregate: jest.Mock;
      updateMany: jest.Mock;
    };
    negocioMiembro: {
      deleteMany: jest.Mock;
    };
    negocioSeguimiento: {
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    notificacion: {
      deleteMany: jest.Mock;
    };
    usuario: {
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      negocio: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      promocion: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      post: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      reserva: {
        updateMany: jest.fn(),
      },
      resena: {
        aggregate: jest.fn(),
        updateMany: jest.fn(),
      },
      negocioMiembro: {
        deleteMany: jest.fn(),
      },
      negocioSeguimiento: {
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      notificacion: {
        deleteMany: jest.fn(),
      },
      usuario: {
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation((input: unknown) => {
      if (typeof input === 'function') {
        return input(prisma);
      }

      return Promise.all(input as Promise<unknown>[]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegocioService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: LogroEngineService,
          useValue: {
            procesarVisitaNegocio: jest.fn(),
            procesarSeguimientoNegocio: jest.fn(),
            registrarAccion: jest.fn(),
            registrarAccionNegocio: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NegocioService>(NegocioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('list solo devuelve negocios activos no eliminados', async () => {
    prisma.negocio.findMany.mockResolvedValue([]);
    prisma.negocio.count.mockResolvedValue(0);

    await service.list({});

    expect(prisma.negocio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activo: true,
          eliminadoEn: null,
        }),
      }),
    );
    expect(prisma.negocio.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        activo: true,
        eliminadoEn: null,
      }),
    });
  });

  function buildInicioNegocio(id: number, nombre = `Negocio ${id}`) {
    return {
      id,
      nombre,
      slug: `negocio-${id}`,
      descripcionCorta: null,
      fotoPerfil: null,
      nenufarColor: null,
      nenufarKey: null,
      nenufarAsset: null,
      categoriaId: 2,
      categoria: { id: 2, nombre: 'Cafeteria' },
      subcategoriaId: 5,
      subcategoria: { id: 5, nombre: 'Brunch' },
      creadoEn: new Date('2026-06-27T10:00:00.000Z'),
    };
  }

  it('inicio anonimo devuelve negocios activos filtrados sin requerir auth', async () => {
    prisma.negocio.findMany.mockResolvedValue([
      buildInicioNegocio(1),
      buildInicioNegocio(2),
    ]);

    const result = await service.listInicio({
      categoriaId: 2,
      subcategoriaId: 5,
      q: 'cafe',
      limit: 12,
    });

    expect(prisma.negocio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activo: true,
          eliminadoEn: null,
          categoriaId: 2,
          subcategoriaId: 5,
          OR: expect.arrayContaining([
            expect.objectContaining({
              nombre: expect.objectContaining({ contains: 'cafe' }),
            }),
          ]),
        }),
      }),
    );
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.seguidoPorMi === false)).toBe(true);
  });

  it('inicio prioriza negocios seguidos y completa con descubrimiento', async () => {
    prisma.negocioSeguimiento.findMany.mockResolvedValue([
      { negocioId: 7, negocio: buildInicioNegocio(7, 'Seguido') },
    ]);
    prisma.negocio.findMany.mockResolvedValue([
      buildInicioNegocio(8, 'Descubrimiento 1'),
      buildInicioNegocio(9, 'Descubrimiento 2'),
    ]);

    const result = await service.listInicio({ limit: 3 }, 99);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 7, seguidoPorMi: true }),
    );
    expect(result.slice(1).every((item) => item.seguidoPorMi === false)).toBe(
      true,
    );
    expect(new Set(result.map((item) => item.id)).size).toBe(result.length);
  });

  it('inicio con cinco o mas seguidos incluye descubrimientos no seguidos', async () => {
    prisma.negocioSeguimiento.findMany.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => ({
        negocioId: id,
        negocio: buildInicioNegocio(id, `Seguido ${id}`),
      })),
    );
    prisma.negocio.findMany.mockResolvedValue([
      buildInicioNegocio(21, 'Nuevo 1'),
      buildInicioNegocio(22, 'Nuevo 2'),
      buildInicioNegocio(23, 'Nuevo 3'),
    ]);

    const result = await service.listInicio({ limit: 6 }, 99);

    expect(result).toHaveLength(6);
    expect(result.slice(0, 3).every((item) => item.seguidoPorMi)).toBe(true);
    expect(result.slice(3).every((item) => item.seguidoPorMi === false)).toBe(
      true,
    );
    expect(prisma.negocio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: [1, 2, 3, 4, 5] },
        }),
      }),
    );
  });

  it('getBySlug acepta nombres y los normaliza a slug', async () => {
    prisma.negocio.findFirst.mockResolvedValue({
      id: 44,
      nombre: 'Peluqueria Pocos Pelos',
      slug: 'peluqueria-pocos-pelos',
      historia: null,
      descripcionCorta: null,
      fechaFundacion: new Date('2020-01-01T00:00:00.000Z'),
      direccion: 'Calle Mayor 1',
      ciudad: 'Oviedo',
      codigoPostal: null,
      provincia: 'Asturias',
      latitud: null,
      longitud: null,
      fotoPerfil: null,
      fotoPortada: null,
      nenufarColor: null,
      nenufarActivo: null,
      nenufarKey: null,
      nenufarAsset: null,
      telefono: null,
      emailContacto: null,
      web: null,
      instagram: null,
      verificado: true,
      activo: true,
      horario: null,
      intervaloReserva: null,
      reservasActivas: false,
      categoria: { id: 1, nombre: 'Belleza' },
      subcategoria: null,
      duenoId: 9,
      dueno: {
        id: 9,
        nombre: 'Ana',
        nickname: 'ana-pocos-pelos',
        foto: null,
      },
      _count: {
        seguidores: 3,
        resenas: 4,
        productos: 0,
        reservas: 0,
      },
    });
    prisma.resena.aggregate.mockResolvedValue({
      _avg: { puntuacion: 4.5 },
      _count: { id: 4 },
    });

    const result = await service.getBySlug('Peluquería Pocos Pelos');

    expect(prisma.negocio.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          activo: true,
          eliminadoEn: null,
          OR: expect.arrayContaining([
            { slug: 'Peluquería Pocos Pelos' },
            { slug: 'peluqueria-pocos-pelos' },
            { nombre: 'Peluquería Pocos Pelos' },
          ]),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 44,
        slug: 'peluqueria-pocos-pelos',
        nenufarActivo: null,
        mediaResenas: 4.5,
      }),
    );
  });

  it('getBySlug devuelve horario normalizado aunque estuviera guardado con dias del frontend', async () => {
    prisma.negocio.findFirst.mockResolvedValue({
      id: 44,
      nombre: 'Peluqueria Pocos Pelos',
      slug: 'peluqueria-pocos-pelos',
      historia: null,
      descripcionCorta: null,
      fechaFundacion: new Date('2020-01-01T00:00:00.000Z'),
      direccion: 'Calle Mayor 1',
      ciudad: 'Oviedo',
      codigoPostal: null,
      provincia: 'Asturias',
      latitud: null,
      longitud: null,
      fotoPerfil: null,
      fotoPortada: null,
      nenufarColor: null,
      nenufarActivo: null,
      nenufarKey: null,
      nenufarAsset: null,
      telefono: null,
      emailContacto: null,
      web: null,
      instagram: null,
      verificado: true,
      activo: true,
      horario: {
        lunes: { abierto: true, apertura: '10:00', cierre: '20:00' },
        domingo: { abierto: false },
      },
      intervaloReserva: 30,
      reservasActivas: true,
      categoria: { id: 1, nombre: 'Belleza' },
      subcategoria: null,
      duenoId: 9,
      dueno: {
        id: 9,
        nombre: 'Ana',
        nickname: 'ana-pocos-pelos',
        foto: null,
        petalosSaldo: 0,
      },
      _count: {
        seguidores: 3,
        resenas: 4,
        productos: 0,
        reservas: 0,
      },
    });
    prisma.resena.aggregate.mockResolvedValue({
      _avg: { puntuacion: 4.5 },
      _count: { id: 4 },
    });

    const result = await service.getBySlug('peluqueria-pocos-pelos');

    expect(result).toEqual(
      expect.objectContaining({
        horario: {
          weekly: {
            mon: [['10:00', '20:00']],
            tue: [],
            wed: [],
            thu: [],
            fri: [],
            sat: [],
            sun: [],
          },
        },
        intervaloReserva: 30,
        reservasActivas: true,
      }),
    );
  });

  it('setConfigHorario normaliza el horario semanal del frontend', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      duenoId: 9,
      horario: null,
      intervaloReserva: null,
      reservasActivas: false,
    });
    prisma.negocio.update.mockResolvedValue({
      id: 44,
      nombre: 'Peluqueria Pocos Pelos',
      intervaloReserva: 30,
      reservasActivas: true,
      horario: {
        weekly: {
          mon: [['10:00', '20:00']],
          tue: [['10:00', '20:00']],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
      },
    });

    await service.setConfigHorario(
      44,
      {
        reservasActivas: true,
        intervaloReserva: 30,
        horario: {
          lunes: { abierto: true, apertura: '10:00', cierre: '20:00' },
          martes: { abierto: true, apertura: '10:00', cierre: '20:00' },
          domingo: { abierto: false },
        },
      },
      9,
    );

    expect(prisma.negocio.update).toHaveBeenCalledWith({
      where: { id: 44 },
      data: {
        intervaloReserva: 30,
        reservasActivas: true,
        horario: {
          weekly: {
            mon: [['10:00', '20:00']],
            tue: [['10:00', '20:00']],
            wed: [],
            thu: [],
            fri: [],
            sat: [],
            sun: [],
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        intervaloReserva: true,
        reservasActivas: true,
        horario: true,
      },
    });
  });

  it('setConfigHorario rechaza activar reservas sin dias abiertos', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      duenoId: 9,
      horario: null,
      intervaloReserva: null,
      reservasActivas: false,
    });

    await expect(
      service.setConfigHorario(
        44,
        {
          reservasActivas: true,
          intervaloReserva: 30,
          horario: {
            domingo: { abierto: false },
          },
        },
        9,
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_SCHEDULE',
      message:
        'Si las reservas estan activas, debe haber al menos un dia abierto',
    });

    expect(prisma.negocio.update).not.toHaveBeenCalled();
  });

  it('remove devuelve NotFound si el negocio no existe', async () => {
    prisma.negocio.findUnique.mockResolvedValue(null);

    await expect(service.remove(5, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('remove mantiene Forbidden si el actor no es dueño ni admin', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      id: 5,
      nombre: 'Cafe Demo',
      duenoId: 12,
      activo: true,
      eliminadoEn: null,
    });

    await expect(service.remove(5, 9)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('remove desde admin elimina solo el negocio y no desactiva al dueño', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      id: 5,
      nombre: 'Cafe Demo',
      duenoId: 12,
      activo: true,
      eliminadoEn: null,
    });
    prisma.promocion.findMany.mockResolvedValue([{ id: 41 }]);
    prisma.post.findMany.mockResolvedValue([{ id: 91 }]);
    prisma.promocion.updateMany.mockResolvedValue({ count: 1 });
    prisma.reserva.updateMany.mockResolvedValue({ count: 1 });
    prisma.post.updateMany.mockResolvedValue({ count: 1 });
    prisma.resena.updateMany.mockResolvedValue({ count: 1 });
    prisma.negocioMiembro.deleteMany.mockResolvedValue({ count: 1 });
    prisma.negocioSeguimiento.deleteMany.mockResolvedValue({ count: 1 });
    prisma.notificacion.deleteMany.mockResolvedValue({ count: 1 });
    prisma.negocio.update.mockResolvedValue({});

    const result = await service.remove(5, 99, true);

    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(prisma.promocion.updateMany).toHaveBeenCalledWith({
      where: {
        negocioId: 5,
        OR: [
          { activa: true },
          { estado: { not: ContenidoEstado.ELIMINADO } },
          { eliminadoEn: null },
        ],
      },
      data: {
        activa: false,
        estado: ContenidoEstado.ELIMINADO,
        eliminadoEn: expect.any(Date),
      },
    });
    expect(prisma.reserva.updateMany).toHaveBeenCalledWith({
      where: {
        negocioId: 5,
        fecha: { gte: expect.any(Date) },
        estado: {
          in: [ReservaEstado.PENDIENTE, ReservaEstado.CONFIRMADA],
        },
      },
      data: {
        estado: ReservaEstado.CANCELADA,
        canceladaEn: expect.any(Date),
        motivoCancelacion: 'Negocio eliminado',
      },
    });
    expect(result).toEqual({
      ok: true,
      message: 'Negocio eliminado correctamente',
      userDeleted: false,
      sessionClosed: false,
    });
  });

  it('remove desde la dueña elimina también la usuaria si no tiene más negocios activos', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      id: 5,
      nombre: 'Cafe Demo',
      duenoId: 9,
      activo: true,
      eliminadoEn: null,
    });
    prisma.promocion.findMany.mockResolvedValue([{ id: 41 }]);
    prisma.post.findMany.mockResolvedValue([{ id: 91 }]);
    prisma.promocion.updateMany.mockResolvedValue({ count: 1 });
    prisma.reserva.updateMany.mockResolvedValue({ count: 1 });
    prisma.post.updateMany.mockResolvedValue({ count: 1 });
    prisma.resena.updateMany.mockResolvedValue({ count: 1 });
    prisma.negocioMiembro.deleteMany.mockResolvedValue({ count: 1 });
    prisma.negocioSeguimiento.deleteMany.mockResolvedValue({ count: 1 });
    prisma.notificacion.deleteMany.mockResolvedValue({ count: 1 });
    prisma.negocio.update.mockResolvedValue({});
    prisma.negocio.count.mockResolvedValue(0);
    prisma.usuario.update.mockResolvedValue({
      id: 9,
      estadoCuenta: EstadoCuenta.ELIMINADA,
    });

    const result = await service.remove(5, 9);

    expect(prisma.negocio.count).toHaveBeenCalledWith({
      where: {
        duenoId: 9,
        id: { not: 5 },
        activo: true,
        eliminadoEn: null,
      },
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        estadoCuenta: EstadoCuenta.ELIMINADA,
        eliminadoEn: expect.any(Date),
        emailVerificado: false,
      },
    });
    expect(result).toEqual({
      ok: true,
      message: 'Cuenta de negocio eliminada correctamente',
      userDeleted: true,
      sessionClosed: true,
      remainingActiveBusinesses: 0,
    });
  });

  it('remove desde la dueña conserva la usuaria si aún tiene otros negocios activos', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      id: 5,
      nombre: 'Cafe Demo',
      duenoId: 9,
      activo: true,
      eliminadoEn: null,
    });
    prisma.promocion.findMany.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);
    prisma.promocion.updateMany.mockResolvedValue({ count: 0 });
    prisma.reserva.updateMany.mockResolvedValue({ count: 0 });
    prisma.post.updateMany.mockResolvedValue({ count: 0 });
    prisma.resena.updateMany.mockResolvedValue({ count: 0 });
    prisma.negocioMiembro.deleteMany.mockResolvedValue({ count: 0 });
    prisma.negocioSeguimiento.deleteMany.mockResolvedValue({ count: 0 });
    prisma.notificacion.deleteMany.mockResolvedValue({ count: 0 });
    prisma.negocio.update.mockResolvedValue({});
    prisma.negocio.count.mockResolvedValue(2);

    const result = await service.remove(5, 9);

    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      message:
        'Negocio eliminado, pero el usuario mantiene otros negocios activos.',
      userDeleted: false,
      sessionClosed: false,
      remainingActiveBusinesses: 2,
    });
  });
});
