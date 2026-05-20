import { Controller, Get, Header } from '@nestjs/common';
import { ResenaService } from './reseña/resena.service';
import { PromocionService } from './promocion/promocion.service';

@Controller('inicio')
export class AppController {
  constructor(
    private readonly resenaService: ResenaService,
    private readonly promocionService: PromocionService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  async inicio() {
    const [resenas, promos] = await Promise.all([
      this.resenaService.obtenerUltimas(10),
      this.promocionService.listarActivas(),
    ]);
    return {
      bienvenida: '¡Bienvenido a Nenúfar!',
      resenas,
      promos,
    };
  }
}
