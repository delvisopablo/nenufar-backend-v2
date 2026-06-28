import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListaTipo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionService } from '../notificacion/notificacion.service';
import { ListaCompraService } from './lista-compra.service';

describe('ListaCompraService', () => {
  let service: ListaCompraService;
  let prisma: {
    listaCompra: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    listaCompraCodigo: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    negocio: {
      findUnique: jest.Mock;
    };
    producto: {
      findFirst: jest.Mock;
    };
    listaCompraItem: {
      upsert: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const now = new Date('2026-05-29T10:00:00.000Z');
  const lista = {
    id: 1,
    usuarioId: 7,
    nombre: 'Mi lista de la compra',
    tipo: ListaTipo.COMPRA,
    descripcion: null,
    color: null,
    iconoNenufar: null,
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
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      listaCompraCodigo: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      negocio: {
        findUnique: jest.fn(),
      },
      producto: {
        findFirst: jest.fn(),
      },
      listaCompraItem: {
        upsert: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListaCompraService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificacionService,
          useValue: { fanoutUsuario: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ListaCompraService>(ListaCompraService);
  });

  it('crea la lista de la compra por defecto si no existe', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(null);
    prisma.listaCompra.create.mockResolvedValue(lista);

    const result = await service.getLista(7);

    expect(prisma.listaCompra.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: 7, tipo: ListaTipo.COMPRA, eliminadaEn: null },
      select: expect.any(Object),
      orderBy: { creadaEn: 'asc' },
    });
    expect(prisma.listaCompra.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 7,
        nombre: 'Mi lista de la compra',
        tipo: ListaTipo.COMPRA,
      },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      ...lista,
      items: [],
    });
  });

  it('reutiliza la lista de la compra existente', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(lista);

    const result = await service.getLista(7);

    expect(prisma.listaCompra.create).not.toHaveBeenCalled();
    expect(result).toEqual({ ...lista, items: [] });
  });

  it('agrega producto si no estaba en la lista', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(lista);
    prisma.producto.findFirst.mockResolvedValue({ id: 2 });
    prisma.listaCompraItem.findFirst.mockResolvedValue(null);
    prisma.listaCompraItem.create.mockResolvedValue(itemConProducto);

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
    expect(prisma.listaCompraItem.findFirst).toHaveBeenCalledWith({
      where: {
        listaCompraId: 1,
        productoId: 2,
      },
      select: { id: true },
    });
    expect(prisma.listaCompraItem.create).toHaveBeenCalledWith({
      data: {
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

  it('rechaza producto duplicado en la misma lista', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(lista);
    prisma.producto.findFirst.mockResolvedValue({ id: 2 });
    prisma.listaCompraItem.findFirst.mockResolvedValue({ id: 9 });

    await expect(
      service.addItem(7, {
        productoId: 2,
        cantidad: 1,
      }),
    ).rejects.toMatchObject({
      code: 'PRODUCT_ALREADY_IN_LIST',
      message: 'Este producto ya está en la lista.',
    });
    expect(prisma.listaCompraItem.create).not.toHaveBeenCalled();
  });

  it('exige nombreManual cuando no se envia productoId', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(lista);

    await expect(service.addItem(7, { cantidad: 1 })).rejects.toMatchObject({
      code: 'REQUIRED_FIELD',
      message: 'nombreManual es obligatorio si no se indica productoId',
    });
    expect(prisma.listaCompraItem.create).not.toHaveBeenCalled();
  });

  it('no permite modificar items de otro usuario', async () => {
    prisma.listaCompraItem.findUnique.mockResolvedValue({
      id: 99,
      listaCompra: { usuarioId: 8 },
    });

    await expect(
      service.updateItem(7, 99, { completado: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.listaCompraItem.update).not.toHaveBeenCalled();
  });

  it('borra solo items propios y devuelve ok', async () => {
    prisma.listaCompraItem.findUnique.mockResolvedValue({
      id: 9,
      listaCompra: { usuarioId: 7 },
    });
    prisma.listaCompraItem.delete.mockResolvedValue({ id: 9 });

    const result = await service.removeItem(7, 9);

    expect(prisma.listaCompraItem.delete).toHaveBeenCalledWith({
      where: { id: 9 },
    });
    expect(result).toEqual({ ok: true, itemId: 9 });
  });

  it('borra solo completados de la lista de la compra por defecto', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue(lista);
    prisma.listaCompraItem.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeCompleted(7);

    expect(prisma.listaCompraItem.deleteMany).toHaveBeenCalledWith({
      where: {
        completado: true,
        listaCompraId: 1,
      },
    });
    expect(result).toEqual({ ok: true, deletedCount: 2 });
  });

  it('no duplica un producto al marcarlo favorito dos veces', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue({
      id: 3,
      tipo: ListaTipo.FAVORITOS,
    });
    prisma.listaCompraItem.upsert.mockResolvedValue(itemConProducto);

    await service.sincronizarFavorito(7, 2, true);

    expect(prisma.listaCompra.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: 7, tipo: ListaTipo.FAVORITOS, eliminadaEn: null },
      select: { id: true },
      orderBy: { creadaEn: 'asc' },
    });
    expect(prisma.listaCompraItem.upsert).toHaveBeenCalledWith({
      where: { listaCompraId_productoId: { listaCompraId: 3, productoId: 2 } },
      update: {},
      create: { listaCompraId: 3, productoId: 2, cantidad: 1 },
    });
  });

  it('quita el producto de la lista de favoritos al desmarcarlo', async () => {
    prisma.listaCompra.findFirst.mockResolvedValue({ id: 3 });
    prisma.listaCompraItem.deleteMany.mockResolvedValue({ count: 1 });

    await service.sincronizarFavorito(7, 2, false);

    expect(prisma.listaCompra.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: 7, tipo: ListaTipo.FAVORITOS, eliminadaEn: null },
      select: { id: true },
    });
    expect(prisma.listaCompraItem.deleteMany).toHaveBeenCalledWith({
      where: { listaCompraId: 3, productoId: 2 },
    });
  });

  describe('cerrarLista', () => {
    const itemValido = {
      id: 10,
      productoId: 2,
      nombreManual: null,
      cantidad: 2,
      nota: null,
      producto: {
        id: 2,
        nombre: 'Pan',
        foto: null,
        precio: 1.5,
        activo: true,
        eliminadoEn: null,
        negocioId: 5,
        negocio: {
          id: 5,
          nombre: 'Horno Nenufar',
          duenoId: 70,
          categoriaId: 1,
          activo: true,
          eliminadoEn: null,
        },
      },
    };
    const itemManual = {
      id: 11,
      productoId: null,
      nombreManual: 'Servilletas',
      cantidad: 1,
      nota: null,
      producto: null,
    };

    it('agrupa items por negocio y crea un pedido pendiente por cada uno', async () => {
      prisma.listaCompra.findFirst.mockResolvedValue({
        id: 1,
        nombre: 'Mi lista de la compra',
        items: [itemValido, itemManual],
      });

      const pedidoCreate = jest.fn().mockResolvedValue({ id: 99 });
      prisma.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({ pedido: { create: pedidoCreate } }),
      );
      prisma.negocio.findUnique.mockResolvedValue({
        duenoId: 70,
        miembros: [],
      });

      const result = await service.cerrarLista(7, 1);

      expect(pedidoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            negocioId: 5,
            usuarioId: 7,
            listaCompraId: 1,
          }),
          select: { id: true },
        }),
      );
      expect(result.ok).toBe(true);
      expect(result.pedidosCreados).toEqual([
        {
          pedidoId: 99,
          negocioId: 5,
          negocioNombre: 'Horno Nenufar',
          total: 3,
          items: 1,
        },
      ]);
      expect(result.avisos).toHaveLength(1);
      expect(result.avisos[0]).toContain('Servilletas');
    });

    it('falla si ningún item es elegible para generar pedido', async () => {
      prisma.listaCompra.findFirst.mockResolvedValue({
        id: 1,
        nombre: 'Mi lista de la compra',
        items: [itemManual],
      });

      await expect(service.cerrarLista(7, 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('no permite cerrar una lista ajena', async () => {
      prisma.listaCompra.findFirst.mockResolvedValue(null);

      await expect(service.cerrarLista(7, 1)).rejects.toThrow(
        'Lista no encontrada',
      );
    });
  });

  describe('códigos para compartir/importar', () => {
    it('genera un código y guarda el snapshot fijo de la lista', async () => {
      prisma.listaCompra.findFirst.mockResolvedValue({
        ...lista,
        items: [itemConProducto],
      });
      prisma.listaCompraCodigo.create.mockResolvedValue({ id: 1 });

      const result = await service.generarCodigoCompartir(7, 1);

      expect(result.codigo).toMatch(/^NENU-[A-Z0-9]{8}$/);
      expect(prisma.listaCompraCodigo.create).toHaveBeenCalledTimes(1);
      const callArg = prisma.listaCompraCodigo.create.mock.calls[0][0];
      expect(callArg.data.usuarioOrigenId).toBe(7);
      expect(callArg.data.listaCompraId).toBe(1);
      expect(callArg.data.snapshot.items).toHaveLength(1);
      expect(callArg.data.snapshot.items[0].producto.negocio.id).toBe(5);
    });

    it('previsualiza un código sin exponer datos privados del dueño', async () => {
      prisma.listaCompraCodigo.findFirst.mockResolvedValue({
        codigo: 'NENU-ABCD1234',
        nombreSnapshot: 'Proteína',
        creadoEn: now,
        snapshot: {
          nombre: 'Proteína',
          descripcion: null,
          color: null,
          iconoNenufar: null,
          generadoEn: now.toISOString(),
          items: [
            {
              productoId: 2,
              nombreManual: null,
              cantidad: 1,
              nota: null,
              producto: null,
            },
          ],
        },
      });

      const preview = await service.previewCodigo('NENU-ABCD1234');

      expect(preview).not.toHaveProperty('usuarioOrigenId');
      expect(preview).not.toHaveProperty('snapshot');
      expect(preview.itemsCount).toBe(1);
    });

    it('importa un código como lista independiente y marca productos no disponibles', async () => {
      prisma.listaCompraCodigo.findFirst.mockResolvedValue({
        id: 5,
        codigo: 'NENU-ABCD1234',
        nombreSnapshot: 'Proteína',
        snapshot: {
          nombre: 'Proteína',
          descripcion: 'desc',
          color: '#fff',
          iconoNenufar: 'icono',
          generadoEn: now.toISOString(),
          items: [
            {
              productoId: 2,
              nombreManual: null,
              cantidad: 2,
              nota: null,
              producto: { nombre: 'Pan' },
            },
            {
              productoId: 99,
              nombreManual: null,
              cantidad: 1,
              nota: null,
              producto: { nombre: 'Descatalogado' },
            },
          ],
        },
      });

      const listaCreate = jest.fn().mockResolvedValue({ id: 50 });
      const itemCreate = jest.fn().mockResolvedValue({});
      const codigoUpdate = jest.fn().mockResolvedValue({});
      const findUniqueOrThrow = jest
        .fn()
        .mockResolvedValue({ ...lista, id: 50, items: [] });
      const productoFindFirst = jest
        .fn()
        .mockImplementation(({ where }: { where: { id: number } }) =>
          Promise.resolve(where.id === 2 ? { id: 2 } : null),
        );

      prisma.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            listaCompra: { create: listaCreate, findUniqueOrThrow },
            listaCompraItem: { create: itemCreate },
            listaCompraCodigo: { update: codigoUpdate },
            producto: { findFirst: productoFindFirst },
          }),
      );

      const result = await service.importarCodigo(8, {
        codigo: 'NENU-ABCD1234',
      });

      expect(listaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 8, nombre: 'Proteína' }),
        }),
      );
      expect(itemCreate).toHaveBeenCalledTimes(2);
      expect(codigoUpdate).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { usadoVeces: { increment: 1 } },
      });
      expect(result.productosNoDisponibles).toEqual(['Descatalogado']);
    });
  });
});
