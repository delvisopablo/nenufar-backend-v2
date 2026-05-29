import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ListaCompraService } from './lista-compra.service';

describe('ListaCompraService', () => {
  let service: ListaCompraService;
  let prisma: {
    listaCompra: {
      upsert: jest.Mock;
    };
    producto: {
      findFirst: jest.Mock;
    };
    listaCompraItem: {
      upsert: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const now = new Date('2026-05-29T10:00:00.000Z');
  const lista = {
    id: 1,
    usuarioId: 7,
    nombre: 'Mi lista de la compra',
    creadaEn: now,
    actualizadaEn: now,
    items: [],
  };
  const itemConProducto = {
    id: 9,
    listaCompraId: 1,
    productoId: 2,
    nombreManual: null,
    cantidad: 3,
    completado: false,
    nota: 'sin sal',
    creadoEn: now,
    producto: {
      id: 2,
      negocioId: 5,
      nombre: 'Pan',
      descripcion: null,
      precio: 1.25,
      foto: null,
      codigoProducto: 'PROD-000002',
      codigoSKU: null,
      activo: true,
      creadoEn: now,
      actualizadoEn: now,
      eliminadoEn: null,
      negocio: {
        id: 5,
        nombre: 'Horno Nenufar',
        slug: 'horno-nenufar',
        fotoPerfil: null,
        fotoPortada: null,
        nenufarActivo: null,
        nenufarAsset: null,
        activo: true,
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      listaCompra: {
        upsert: jest.fn(),
      },
      producto: {
        findFirst: jest.fn(),
      },
      listaCompraItem: {
        upsert: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListaCompraService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ListaCompraService>(ListaCompraService);
  });

  it('crea o devuelve la lista principal del usuario', async () => {
    prisma.listaCompra.upsert.mockResolvedValue(lista);

    const result = await service.getLista(7);

    expect(prisma.listaCompra.upsert).toHaveBeenCalledWith({
      where: { usuarioId: 7 },
      update: {},
      create: { usuarioId: 7 },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      ...lista,
      items: [],
    });
  });

  it('aumenta cantidad si el producto ya esta en la lista', async () => {
    prisma.listaCompra.upsert.mockResolvedValue(lista);
    prisma.producto.findFirst.mockResolvedValue({ id: 2 });
    prisma.listaCompraItem.upsert.mockResolvedValue(itemConProducto);

    const result = await service.addItem(7, {
      productoId: 2,
      cantidad: 2,
      nota: ' sin sal ',
    });

    expect(prisma.producto.findFirst).toHaveBeenCalledWith({
      where: {
        id: 2,
        activo: true,
        eliminadoEn: null,
        negocio: {
          activo: true,
          eliminadoEn: null,
        },
      },
      select: { id: true },
    });
    expect(prisma.listaCompraItem.upsert).toHaveBeenCalledWith({
      where: {
        listaCompraId_productoId: {
          listaCompraId: 1,
          productoId: 2,
        },
      },
      update: {
        cantidad: { increment: 2 },
        nota: 'sin sal',
      },
      create: {
        listaCompraId: 1,
        productoId: 2,
        cantidad: 2,
        nota: 'sin sal',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        productoId: 2,
        producto: expect.objectContaining({
          id: 2,
          negocio: expect.objectContaining({ id: 5 }),
        }),
      }),
    );
  });

  it('exige nombreManual cuando no se envia productoId', async () => {
    prisma.listaCompra.upsert.mockResolvedValue(lista);

    await expect(service.addItem(7, { cantidad: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.listaCompraItem.create).not.toHaveBeenCalled();
  });

  it('no permite modificar items de otro usuario', async () => {
    prisma.listaCompraItem.findFirst.mockResolvedValue(null);

    await expect(
      service.updateItem(7, 99, { completado: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.listaCompraItem.update).not.toHaveBeenCalled();
  });

  it('borra solo completados del usuario autenticado', async () => {
    prisma.listaCompraItem.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeCompleted(7);

    expect(prisma.listaCompraItem.deleteMany).toHaveBeenCalledWith({
      where: {
        completado: true,
        listaCompra: { usuarioId: 7 },
      },
    });
    expect(result).toEqual({ eliminados: 2 });
  });
});
