import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListaCompraService } from './lista-compra.service';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';
import { AddListaCompraItemDto } from './dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from './dto/update-lista-compra-item.dto';
import { ImportarCodigoDto } from './dto/importar-codigo.dto';

@ApiTags('Mi Nenulista')
@Controller('me/listas')
export class MisListasController {
  constructor(private readonly service: ListaCompraService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get()
  listar(@Req() req: any) {
    return this.service.listListas(this.getAuthenticatedUserId(req));
  }

  @Post()
  crear(@Body() dto: CreateListaDto, @Req() req: any) {
    return this.service.crearLista(this.getAuthenticatedUserId(req), dto);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.getListaById(this.getAuthenticatedUserId(req), id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListaDto,
    @Req() req: any,
  ) {
    return this.service.actualizarLista(
      this.getAuthenticatedUserId(req),
      id,
      dto,
    );
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.eliminarLista(this.getAuthenticatedUserId(req), id);
  }

  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddListaCompraItemDto,
    @Req() req: any,
  ) {
    return this.service.addItemALista(
      this.getAuthenticatedUserId(req),
      id,
      dto,
    );
  }

  @Patch(':id/items/:itemId')
  actualizarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateListaCompraItemDto,
    @Req() req: any,
  ) {
    return this.service.updateItemDeLista(
      this.getAuthenticatedUserId(req),
      id,
      itemId,
      dto,
    );
  }

  @Delete(':id/items/:itemId')
  eliminarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: any,
  ) {
    return this.service.removeItemDeLista(
      this.getAuthenticatedUserId(req),
      id,
      itemId,
    );
  }

  @Post(':id/cerrar')
  cerrar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cerrarLista(this.getAuthenticatedUserId(req), id);
  }

  @Post(':id/codigo-compartir')
  generarCodigoCompartir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.service.generarCodigoCompartir(
      this.getAuthenticatedUserId(req),
      id,
    );
  }

  @Post('importar-codigo')
  importarCodigo(@Body() dto: ImportarCodigoDto, @Req() req: any) {
    return this.service.importarCodigo(this.getAuthenticatedUserId(req), dto);
  }
}
