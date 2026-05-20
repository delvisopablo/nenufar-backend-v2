/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
} from '@nestjs/common';
import { EstadoSolicitudProducto } from '@prisma/client';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateProductoStockDto } from './dto/update-producto-stock.dto';
import {
  AprobarSolicitudProductoDto,
  CreateSolicitudProductoDto,
} from './dto/create-solicitud-producto.dto';
import { RechazarSolicitudProductoDto } from './dto/rechazar-solicitud-producto.dto';

@Controller()
export class ProductoController {
  constructor(private service: ProductoService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get('negocios/:id/productos')
  listByNegocio(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listByNegocio(negocioId, q, page, limit);
  }

  @Post('negocios/:id/productos')
  create(
    @Param('id', ParseIntPipe) negocioId: number,
    @Body() dto: CreateProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.create(negocioId, dto, currentUserId, isAdmin);
  }

  @Post('negocios/:id/solicitudes-producto')
  crearSolicitud(
    @Param('id', ParseIntPipe) negocioId: number,
    @Body() dto: CreateSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    return this.service.crearSolicitud(negocioId, dto, currentUserId);
  }

  @Get('negocios/:id/solicitudes-producto')
  listarSolicitudes(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query('estado') estado: EstadoSolicitudProducto | undefined,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.listarSolicitudes(
      negocioId,
      currentUserId,
      isAdmin,
      estado,
    );
  }

  @Get('productos/buscar')
  search(@Query('q') q = '', @Query('limit') limit?: number) {
    return this.service.search(q, limit);
  }

  @Get('productos/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Patch('productos/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.update(id, dto, currentUserId, isAdmin);
  }

  @Patch('productos/:id/stock')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoStockDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.adjustStock(id, dto, currentUserId, isAdmin);
  }

  @Delete('productos/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.remove(id, currentUserId, isAdmin);
  }

  @Patch('solicitudes-producto/:id/aprobar')
  aprobarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.aprobarSolicitud(id, dto, currentUserId, isAdmin);
  }

  @Patch('solicitudes-producto/:id/rechazar')
  rechazarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.rechazarSolicitud(id, dto, currentUserId, isAdmin);
  }
}
