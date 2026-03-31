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
} from '@nestjs/common';
import { NegocioService } from './negocio.service';
import { CreateNegocioDto } from './dto/create-negocio.dto';
import { UpdateNegocioDto } from './dto/update-negocio.dto';
import { QueryNegocioDto } from './dto/query-negocio.dto';
import { ConfigHorarioDto } from './dto/config-horario.dto';
import { ResenaService } from '../reseña/resena.service';

@Controller('negocios')
export class NegocioController {
  constructor(
    private service: NegocioService,
    private readonly resenaService: ResenaService,
  ) {}

  @Get()
  list(@Query() q: QueryNegocioDto) {
    return this.service.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get(':id/resenas')
  resenas(@Param('id', ParseIntPipe) id: number) {
    return this.resenaService.getResenasPorNegocio(id);
  }

  @Post()
  create(@Body() dto: CreateNegocioDto, @Req() req: any) {
    const currentUserId = req.user?.id ?? 1; // TODO: JwtAuthGuard real
    return this.service.create(dto, currentUserId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNegocioDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.id ?? 1;
    const isAdmin = !!req.user?.isAdmin;
    return this.service.update(id, dto, currentUserId, isAdmin);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUserId = req.user?.id ?? 1;
    const isAdmin = !!req.user?.isAdmin;
    return this.service.remove(id, currentUserId, isAdmin);
  }

  @Patch(':id/config-horario')
  configHorario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfigHorarioDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.id ?? 1;
    const isAdmin = !!req.user?.isAdmin;
    return this.service.setConfigHorario(id, dto, currentUserId, isAdmin);
  }

  @Get(':id/horario')
  horario(@Param('id', ParseIntPipe) id: number) {
    return this.service.getHorario(id);
  }
}
