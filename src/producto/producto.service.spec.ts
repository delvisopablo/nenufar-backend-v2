import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductoService } from './producto.service';

describe('ProductoService', () => {
  let service: ProductoService;
  let prisma: {
    $transaction: jest.Mock;
    negocio: {
      findUnique: jest.Mock;
    };
    usuario: {
      findUnique: jest.Mock;
    };
    producto: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      negocio: {
        findUnique: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      producto: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      Promise.resolve(
        callback({
          producto: prisma.producto,
          negocio: prisma.negocio,
          usuario: prisma.usuario,
        }),
      ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductoService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProductoService>(ProductoService);
  });

  it('genera codigoProducto automaticamente al crear', async () => {
    prisma.negocio.findUnique.mockResolvedValue({
      id: 3,
      duenoId: 7,
      activo: true,
      eliminadoEn: null,
    });
    prisma.producto.create.mockResolvedValue({
      id: 12,
      negocioId: 3,
      nombre: 'Corte de pelo',
      descripcion: 'Corte basico',
      precio: 10,
      foto: null,
      codigoProducto: null,
      codigoSKU: null,
      activo: true,
      creadoEn: new Date('2026-05-11T10:00:00.000Z'),
      actualizadoEn: new Date('2026-05-11T10:00:00.000Z'),
      eliminadoEn: null,
    });
    prisma.producto.update.mockResolvedValue({
      id: 12,
      negocioId: 3,
      nombre: 'Corte de pelo',
      descripcion: 'Corte basico',
      precio: 10,
      foto: null,
      codigoProducto: 'PROD-000012',
      codigoSKU: 'PROD-000012',
      activo: true,
      creadoEn: new Date('2026-05-11T10:00:00.000Z'),
      actualizadoEn: new Date('2026-05-11T10:00:00.000Z'),
      eliminadoEn: null,
    });

    const result = await service.create(
      3,
      {
        nombre: 'Corte de pelo',
        descripcion: 'Corte basico',
        precio: 10,
      },
      7,
    );

    expect(prisma.producto.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        codigoProducto: 'PROD-000012',
        codigoSKU: 'PROD-000012',
      },
      select: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 12,
        codigoProducto: 'PROD-000012',
      }),
    );
  });

  it('elimina productos con borrado logico', async () => {
    prisma.producto.findUnique.mockResolvedValue({
      id: 44,
      negocioId: 3,
    });
    prisma.negocio.findUnique.mockResolvedValue({
      id: 3,
      duenoId: 7,
      activo: true,
      eliminadoEn: null,
    });
    prisma.producto.update.mockResolvedValue({
      id: 44,
      negocioId: 3,
      nombre: 'Corte de pelo',
      descripcion: null,
      precio: 10,
      foto: null,
      codigoProducto: 'PROD-000044',
      codigoSKU: 'PROD-000044',
      activo: false,
      creadoEn: new Date('2026-05-11T10:00:00.000Z'),
      actualizadoEn: new Date('2026-05-11T10:05:00.000Z'),
      eliminadoEn: new Date('2026-05-11T10:05:00.000Z'),
    });

    const result = await service.remove(44, 7);

    expect(prisma.producto.update).toHaveBeenCalledWith({
      where: { id: 44 },
      data: {
        activo: false,
        eliminadoEn: expect.any(Date),
      },
      select: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 44,
        activo: false,
      }),
    );
  });
});
