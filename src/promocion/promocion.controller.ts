import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { PromocionService } from './promocion.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { ValidarPromocionDto } from './dto/validar-promocion.dto';
// import { AuthGuard } from '../auth/auth.guard';

// @UseGuards(AuthGuard)
@Controller('promociones')
export class PromocionController {
  constructor(private promocionService: PromocionService) {}

  private getRequestUserId(req: {
    user?: { id?: number };
    usuario?: { id?: number };
  }) {
    return req.user?.id ?? req.usuario?.id ?? 1;
  }

  private getOptionalRequestUserId(req: {
    user?: { id?: number };
    usuario?: { id?: number };
  }) {
    const userId = req.user?.id ?? req.usuario?.id;
    return typeof userId === 'number' && userId > 0 ? userId : undefined;
  }

  @Post()
  crear(@Body() dto: CreatePromocionDto, @Request() req) {
    return this.promocionService.crearPromocion(
      dto,
      this.getRequestUserId(req),
    );
  }

  @Get()
  findAll() {
    return this.promocionService.listarDisponibles();
  }

  @Get('activas')
  findActivas() {
    return this.promocionService.listarDisponibles();
  }

  @Get('negocio/:id')
  findByNegocio(@Param('id', ParseIntPipe) id: number) {
    return this.promocionService.listarPorNegocio(id);
  }

  @Post(':id/validar')
  validar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidarPromocionDto,
    @Request() req,
  ) {
    return this.promocionService.validarPromocion(
      id,
      dto,
      this.getOptionalRequestUserId(req),
    );
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromocionDto,
    @Request() req,
  ) {
    return this.promocionService.actualizarPromocion(
      id,
      dto,
      this.getRequestUserId(req),
    );
  }

  @Delete(':id')
  borrar(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.promocionService.borrarPromocion(
      id,
      this.getRequestUserId(req),
    );
  }
}
