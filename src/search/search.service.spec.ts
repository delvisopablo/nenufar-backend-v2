import { EstadoCuenta } from '@prisma/client';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: {
    usuario: {
      findMany: jest.Mock;
    };
  };
  let negocioService: { list: jest.Mock };
  let productoService: { search: jest.Mock };
  let promocionService: { search: jest.Mock };

  beforeEach(() => {
    prisma = {
      usuario: {
        findMany: jest.fn(),
      },
    };
    negocioService = {
      list: jest.fn().mockResolvedValue({ items: [] }),
    };
    productoService = {
      search: jest.fn().mockResolvedValue([]),
    };
    promocionService = {
      search: jest.fn().mockResolvedValue([]),
    };

    service = new SearchService(
      prisma as never,
      negocioService as never,
      productoService as never,
      promocionService as never,
    );
  });

  it('busca usuarios por nickname/nombre y devuelve solo datos publicos', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 21,
        nombre: 'Pablo',
        nickname: 'pablo',
        foto: 'https://cdn.test/pablo.webp',
        biografia: 'Perfil publico',
      },
    ]);

    const result = await service.buscar('pablo', 5);

    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estadoCuenta: EstadoCuenta.ACTIVA,
          eliminadoEn: null,
          OR: expect.arrayContaining([
            { nickname: { contains: 'pablo', mode: 'insensitive' } },
            { nombre: { contains: 'pablo', mode: 'insensitive' } },
            { biografia: { contains: 'pablo', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
    expect(result.usuarios).toEqual([
      {
        id: 21,
        tipo: 'usuario',
        nombre: 'Pablo',
        nickname: 'pablo',
        foto: 'https://cdn.test/pablo.webp',
        fotoPerfil: 'https://cdn.test/pablo.webp',
        biografia: 'Perfil publico',
      },
    ]);
    expect(JSON.stringify(result.usuarios)).not.toContain('email');
    expect(JSON.stringify(result.usuarios)).not.toContain('password');
  });
});
