import { Controller, Get } from '@nestjs/common';
import { ResenaService } from './reseña/resena.service';
import { PromocionService } from './promocion/promocion.service';

@Controller('inicio')
export class AppController {
  constructor(
    private readonly resenaService: ResenaService,
    private readonly promocionService: PromocionService,
  ) {}

  @Get()
  async inicio() {
    const [resenas, promos] = await Promise.all([
      this.resenaService.todasLasResenas(),
      this.promocionService.listarActivas(),
    ]);
    return {
      bienvenida: '¡Bienvenido a Nenúfar!',
      resenas,
      promos,
    };
  }
}
