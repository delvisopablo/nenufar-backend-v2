/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NegocioService } from './negocio.service';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { QueryNegocioDto } from './dto/query-negocio.dto';
import { ConfigHorarioDto } from './dto/config-horario.dto';
import { ResenaService } from '../reseña/resena.service';
import { CreateNegocioMiembroDto } from './dto/create-negocio-miembro.dto';
import { UpdateNegocioMiembroDto } from './dto/update-negocio-miembro.dto';
import { CreateVisitaNegocioDto } from './dto/create-visita-negocio.dto';
import { AuthGuard } from '../auth/auth.guard';
import { SeguirNegocioDto } from './dto/seguir-negocio.dto';
import { ToggleSeguimientoNotificacionesDto } from './dto/toggle-seguimiento-notificaciones.dto';

@ApiTags('Negocios')
@Controller('negocios')
export class NegocioController {
  constructor(
    private service: NegocioService,
    private readonly resenaService: ResenaService,
  ) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  private getOptionalUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    return Number.isInteger(userId) && userId > 0 ? userId : undefined;
  }

  @Get()
  findAll(@Query() q: QueryNegocioDto) {
    return this.service.list(q);
  }

  @Get('me/siguiendo/negocios')
  @UseGuards(AuthGuard)
  listSeguidos(@Req() req: { user?: { id?: number } }) {
    return this.service.getNegociosSeguidosPorUsuario(
      this.getAuthenticatedUserId(req),
    );
  }

  @Get('slug/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getBySlug(slug, this.getOptionalUserId(req));
  }

  @Get(':id/resenas')
  resenas(@Param('id', ParseIntPipe) id: number) {
    return this.resenaService.getResenasPorNegocio(id);
  }

  @Get(':id/seguidores')
  seguidores(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getSeguidores(id, this.getOptionalUserId(req));
  }

  @Post(':id/seguir')
  @UseGuards(AuthGuard)
  seguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() body?: SeguirNegocioDto,
  ) {
    return this.service.seguir(
      id,
      this.getAuthenticatedUserId(req),
      body?.notificaciones,
    );
  }

  @Patch(':id/seguir/notificaciones')
  @UseGuards(AuthGuard)
  updateSeguimientoNotificaciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleSeguimientoNotificacionesDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.updateSeguimientoNotificaciones(
      id,
      this.getAuthenticatedUserId(req),
      dto.activas,
    );
  }

  @Delete(':id/seguir')
  @UseGuards(AuthGuard)
  dejarDeSeguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.dejarDeSeguir(id, this.getAuthenticatedUserId(req));
  }

  @Get(':id/miembros')
  listMiembros(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.listMiembros(id, this.getAuthenticatedUserId(req));
  }

  @Post(':id/miembros')
  createMiembro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNegocioMiembroDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.addMiembro(id, this.getAuthenticatedUserId(req), dto);
  }

  @Patch(':id/miembros/:uid')
  updateMiembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) usuarioId: number,
    @Body() dto: UpdateNegocioMiembroDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.updateMiembro(
      id,
      usuarioId,
      this.getAuthenticatedUserId(req),
      dto,
    );
  }

  @Delete(':id/miembros/:uid')
  removeMiembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('uid', ParseIntPipe) usuarioId: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.removeMiembro(
      id,
      usuarioId,
      this.getAuthenticatedUserId(req),
    );
  }

  @Post(':id/visitas')
  registrarVisita(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVisitaNegocioDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.registrarVisita(id, this.getOptionalUserId(req), dto);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() dto: CreateNegocioDto, @Req() req: any) {
    const currentUserId = this.getAuthenticatedUserId(req);
    return this.service.create(dto, currentUserId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNegocioDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.update(id, dto, currentUserId, isAdmin);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.remove(id, currentUserId, isAdmin);
  }

  @Patch(':id/config-horario')
  configHorario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfigHorarioDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.setConfigHorario(id, dto, currentUserId, isAdmin);
  }

  @Get(':id/horario')
  horario(@Param('id', ParseIntPipe) id: number) {
    return this.service.getHorario(id);
  }
}
