/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ResenaService } from './resena.service';
import { CreateResenaDto } from './dto/create-resena.dto';
import { UpdateResenaDto } from './dto/update-resena.dto';

@Controller('resena')
export class ResenaController {
  constructor(private readonly resenaService: ResenaService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  /** Todas las reseñas (global) */
  @Get()
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  todas(@Query('limit') limit?: number) {
    return this.resenaService.todasLasResenas(limit);
  }

  /** Reseñas de un negocio */
  @Get('negocio/:id')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  porNegocio(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.resenaService.getResenasPorNegocio(id, limit);
  }

  /** Reseñas de un usuario */
  @Get('usuario/:id')
  porUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.resenaService.findByUsuarioId(id);
  }

  /** Últimas reseñas (top 10) */
  @Get('ultimas')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  ultimas(@Query('limit') limit?: number) {
    return this.resenaService.obtenerUltimas(limit);
  }

  /** Media de puntuación para un negocio */
  @Get('media/:negocioId')
  media(@Param('negocioId', ParseIntPipe) negocioId: number) {
    return this.resenaService.calcularMediaPorNegocio(negocioId);
  }

  /** Crear reseña (+ post + pétalos) */
  @Post()
  crear(@Body() dto: CreateResenaDto, @Req() req: any) {
    return this.resenaService.crear(this.getAuthenticatedUserId(req), dto);
  }

  /** Actualizar reseña (solo autor) */
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResenaDto,
    @Req() req: any,
  ) {
    return this.resenaService.actualizar(
      id,
      dto,
      this.getAuthenticatedUserId(req),
    );
  }

  /** Eliminar reseña (solo autor) */
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.resenaService.eliminar(id, this.getAuthenticatedUserId(req));
  }
}
