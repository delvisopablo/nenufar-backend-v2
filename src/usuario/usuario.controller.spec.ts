import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';
import { FavoritosService } from './favoritos.service';
import { NenulistaService } from './nenulista.service';

describe('UsuarioController', () => {
  let controller: UsuarioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioController],
      providers: [
        {
          provide: UsuarioService,
          useValue: {
            crearUsuario: jest.fn(),
            getPerfil: jest.fn(),
            borrarUsuario: jest.fn(),
          },
        },
        {
          provide: FavoritosService,
          useValue: {
            getFavoritos: jest.fn(),
            addFavorito: jest.fn(),
            deleteFavorito: jest.fn(),
          },
        },
        {
          provide: NenulistaService,
          useValue: {
            getNenulista: jest.fn(),
            addProducto: jest.fn(),
            updateItem: jest.fn(),
            deleteItem: jest.fn(),
            clearCompletados: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsuarioController>(UsuarioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
