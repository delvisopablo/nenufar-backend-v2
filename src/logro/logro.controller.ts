import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  // Patch,
  Post,
} from '@nestjs/common';
import { LogroService } from './logro.service';
import { CreateLogroDto } from './dto/create-logro.dto';
// import { UpdateLogroDto } from './dto/update-logro.dto';

@Controller('logros')
export class LogroController {
  constructor(private readonly service: LogroService) {}

  @Post()
  create(@Body() dto: CreateLogroDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // @Patch(':id')
  // update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLogroDto) {
  //   return this.service.update(id, dto);
  // }

  @Post(':logroId/usuario/:usuarioId')
  asignar(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('logroId', ParseIntPipe) logroId: number,
  ) {
    return this.service.asignarOIncrementar(usuarioId, logroId);
  }

  @Get('usuario/:usuarioId')
  porUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.service.logrosPorUsuario(usuarioId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
