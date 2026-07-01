import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ReservaEstado } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ReservaController } from './reserva.controller';
import { ReservaService } from './reserva.service';

describe('ReservaController', () => {
  it('GET /reservas/mis-reservas usa JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ReservaController.prototype.miasAlias,
    ) as unknown[] | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('GET /me/reservas usa JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ReservaController.prototype.mias,
    ) as unknown[] | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('GET /me/reservas devuelve el array de reservas del perfil', async () => {
    const reservas = [
      {
        id: 12,
        estado: 'PENDIENTE',
        fecha: '2026-07-02',
        hora: '20:30',
        personas: 2,
        mensaje: 'Mesa junto a la ventana.',
        motivoCancelacion: null,
        puedeCancelar: true,
        negocio: {
          id: 15,
          nombre: 'Cafe Nenufar',
          fotoPerfil: '/uploads/negocios/cafe.png',
        },
      },
    ];
    const service = {
      misReservasPerfil: jest.fn().mockResolvedValue(reservas),
    } as unknown as ReservaService;
    const controller = new ReservaController(service);

    await expect(controller.mias({ user: { id: 7 } })).resolves.toBe(
      reservas,
    );
    expect(service.misReservasPerfil).toHaveBeenCalledWith(7);
  });
});

describe('ReservaService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('misReservasPerfil devuelve [] si el usuario no tiene reservas', async () => {
    const prisma = {
      reserva: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new ReservaService(prisma as any, {} as any);

    await expect(service.misReservasPerfil(7)).resolves.toEqual([]);
    expect(prisma.reserva.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 7 },
      select: {
        id: true,
        estado: true,
        fecha: true,
        nota: true,
        numPersonas: true,
        motivoCancelacion: true,
        negocio: {
          select: { id: true, nombre: true, fotoPerfil: true },
        },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    });
  });

  it('misReservasPerfil formatea campos para Mis reservas', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 6, 1, 10, 0, 0));

    const prisma = {
      reserva: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 12,
            estado: ReservaEstado.PENDIENTE,
            fecha: new Date(2026, 6, 2, 20, 30, 0),
            nota: 'Mesa junto a la ventana.',
            numPersonas: 2,
            motivoCancelacion: null,
            negocio: {
              id: 15,
              nombre: 'Cafe Nenufar',
              fotoPerfil: '/uploads/negocios/cafe.png',
            },
          },
        ]),
      },
    };
    const service = new ReservaService(prisma as any, {} as any);

    await expect(service.misReservasPerfil(7)).resolves.toEqual([
      {
        id: 12,
        estado: ReservaEstado.PENDIENTE,
        fecha: '2026-07-02',
        hora: '20:30',
        personas: 2,
        mensaje: 'Mesa junto a la ventana.',
        motivoCancelacion: null,
        puedeCancelar: true,
        negocio: {
          id: 15,
          nombre: 'Cafe Nenufar',
          fotoPerfil: '/uploads/negocios/cafe.png',
        },
      },
    ]);
  });
});
