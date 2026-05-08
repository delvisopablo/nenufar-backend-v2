import { Controller, Get, Query } from '@nestjs/common';
import { CodigosNenufarizacionService } from './codigos-nenufarizacion.service';

@Controller('codigos-nenufarizacion')
export class CodigosNenufarizacionController {
  constructor(private readonly service: CodigosNenufarizacionService) {}

  @Get('validar')
  validar(@Query('codigo') codigo: string) {
    if (!codigo?.trim()) {
      return { valido: false, mensaje: 'Código requerido' };
    }
    return this.service.validar(codigo.trim().toUpperCase());
  }
}
