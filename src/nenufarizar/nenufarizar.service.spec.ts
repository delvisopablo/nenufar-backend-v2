/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NenufarizarService } from './nenufarizar.service';

type TransactionCallback = (tx: unknown) => PromiseLike<unknown>;

describe('NenufarizarService', () => {
  let service: NenufarizarService;
  let prisma: {
    $transaction: jest.Mock;
    usuario: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    petaloTx: {
      create: jest.Mock;
    };
    notificacion: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      usuario: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      petaloTx: {
        create: jest.fn(),
      },
      notificacion: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation((callback: TransactionCallback) =>
      Promise.resolve(
        callback({
          usuario: prisma.usuario,
          petaloTx: prisma.petaloTx,
          notificacion: prisma.notificacion,
        }),
      ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NenufarizarService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<NenufarizarService>(NenufarizarService);
  });

  it('devuelve el código existente si el usuario ya lo tiene', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      codigoReferido: 'ABC123',
    });

    await expect(service.generarCodigo(7)).resolves.toBe('ABC123');
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('reintenta la generación si encuentra una colisión única', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      codigoReferido: null,
    });
    prisma.usuario.update
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      )
      .mockResolvedValueOnce({
        codigoReferido: 'ZX9KQ1',
      });

    await expect(service.generarCodigo(7)).resolves.toBe('ZX9KQ1');
    expect(prisma.usuario.update).toHaveBeenCalledTimes(2);
  });

  it('procesa el referido, premia al referidor y crea notificación', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 99,
        referidoPorId: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        petalosSaldo: 100,
      });
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuario.update.mockResolvedValue({ petalosSaldo: 150 });
    prisma.petaloTx.create.mockResolvedValue({});
    prisma.notificacion.create.mockResolvedValue({});

    await service.procesarReferido(99, ' ab12cd ');

    expect(prisma.usuario.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 99 },
      select: { id: true, referidoPorId: true },
    });
    expect(prisma.usuario.findUnique).toHaveBeenNthCalledWith(2, {
      where: { codigoReferido: 'AB12CD' },
      select: { id: true, petalosSaldo: true },
    });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: {
        id: 99,
        referidoPorId: null,
      },
      data: {
        referidoPorId: 7,
      },
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        petalosSaldo: {
          increment: 50,
        },
      },
      select: { petalosSaldo: true },
    });
    expect(prisma.petaloTx.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 7,
        delta: 50,
        saldoResultante: 150,
        motivo: 'REFERIDO',
        refTipo: 'Usuario',
        refId: 99,
      },
    });
    expect(prisma.notificacion.create).toHaveBeenCalledWith({
      data: {
        usuarioId: 7,
        tipo: 'REFERIDO',
        titulo: '¡Tienes un nuevo referido!',
        contenido: 'Alguien se ha unido con tu código. +50 pétalos',
      },
    });
  });

  it('rechaza el auto-referido', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        referidoPorId: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        petalosSaldo: 100,
      });

    await expect(service.procesarReferido(7, 'ABC123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });
});
