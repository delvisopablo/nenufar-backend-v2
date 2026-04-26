import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PromocionService } from './promocion/promocion.service';
import { ResenaService } from './reseña/resena.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ResenaService,
          useValue: { todasLasResenas: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: PromocionService,
          useValue: { getPromos: jest.fn().mockReturnValue([]) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
