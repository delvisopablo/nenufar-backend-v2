/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ReservaService } from './reserva.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaEstadoDto } from './dto/update-reserva-estado.dto';

@Controller()
export class ReservaController {
  constructor(private service: ReservaService) {}

  // Disponibilidad por día
  // GET /negocios/:id/availability?date=YYYY-MM-DD
  @Get('negocios/:id/availability')
  availability(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @Query('recursoId') recursoId?: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('date debe ser YYYY-MM-DD');
    }

    const parsedRecursoId =
      recursoId !== undefined ? Number(recursoId) : undefined;
    if (
      recursoId !== undefined &&
      (!Number.isInteger(parsedRecursoId) ||
        (parsedRecursoId !== undefined && parsedRecursoId <= 0))
    ) {
      throw new BadRequestException('recursoId inválido');
    }

    return this.service.availability(id, date, parsedRecursoId);
  }

  // Crear reserva en un slot
  // POST /negocios/:id/reservas { fecha, nota? }
  @Post('negocios/:id/reservas')
  crear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReservaDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 1; // TODO: JwtAuthGuard
    return this.service.crear(
      id,
      userId,
      dto.fecha,
      dto.nota,
      dto.recursoId,
      dto.duracionMinutos,
      dto.numPersonas,
    );
  }

  @Get('reservas/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Patch('reservas/:id')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservaEstadoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    const actorUserId = Number(req.user?.id);
    if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    return this.service.actualizarEstado(id, actorUserId, dto);
  }

  @Delete('reservas/:id')
  cancelar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id ?? 1;
    const isAdmin = !!req.user?.isAdmin;
    return this.service.cancelar(id, userId, isAdmin);
  }

  @Get('me/reservas')
  mias(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id ?? 1;
    return this.service.misReservas(userId, page, limit);
  }
}
