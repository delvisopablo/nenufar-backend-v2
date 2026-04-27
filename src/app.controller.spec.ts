import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PromocionService } from './promocion/promocion.service';
import { ResenaService } from './reseña/resena.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ResenaService,
          useValue: { todasLasResenas: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: PromocionService,
          useValue: { listarActivas: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('inicio', () => {
    it('should return welcome data', async () => {
      const result = await appController.inicio();
      expect(result).toHaveProperty('bienvenida');
      expect(result).toHaveProperty('resenas');
      expect(result).toHaveProperty('promos');
    });
  });
});
