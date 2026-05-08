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
        mediaResenas: 4.5,
      }),
    );
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
