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
import { PedidoService } from './pedido.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateCompraDto } from './dto/create-compra.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { QueryNegocioPedidosDto } from './dto/query-negocio-pedidos.dto';
import { UpdatePagoEstadoDto } from './dto/update-pago-estado.dto';

@Controller()
export class PedidoController {
  constructor(private service: PedidoService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  // ---- Pedidos ----
  @Post('negocios/:negocioId/pedidos')
  createPedido(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.createPedido(negocioId, req.user?.id);
  }

  @Get('negocios/:negocioId/pedidos')
  listPedidosNegocio(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Query() query: QueryNegocioPedidosDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.listByNegocio(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('pedidos/:id')
  getPedido(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPedido(id);
  }

  @Patch('pedidos/:id')
  updatePedido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoDto,
  ) {
    return this.service.updatePedido(id, dto);
  }

  // líneas
  @Post('pedidos/:id/items')
  addItem(
    @Param('id', ParseIntPipe) pedidoId: number,
    @Body() dto: AddItemDto,
  ) {
    return this.service.addItem(pedidoId, dto);
  }

  @Patch('pedidos/:id/items/:productoId')
  updateItem(
    @Param('id', ParseIntPipe) pedidoId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.service.updateItemCantidad(pedidoId, productoId, dto);
  }

  @Delete('pedidos/:id/items/:productoId')
  removeItem(
    @Param('id', ParseIntPipe) pedidoId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.service.removeItem(pedidoId, productoId);
  }

  // ---- Compras ----
  @Post('pedidos/:id/compras')
  createCompra(
    @Param('id', ParseIntPipe) pedidoId: number,
    @Body() dto: CreateCompraDto,
    @Req() req: { user?: { id?: number } },
  ) {
    const userId = req.user?.id ?? 1; // TODO: JwtAuthGuard
    return this.service.createCompra(pedidoId, userId, dto);
  }

  @Get('compras/:id')
  getCompra(@Param('id', ParseIntPipe) id: number) {
    return this.service.getCompra(id);
  }

  @Get('me/compras')
  misCompras(
    @Req() req: { user?: { id?: number } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id ?? 1;
    return this.service.listComprasUsuario(userId, page, limit);
  }

  // ---- Pagos ----
  @Post('compras/:id/pagos')
  createPago(
    @Param('id', ParseIntPipe) compraId: number,
    @Body() dto: CreatePagoDto,
  ) {
    return this.service.createPago(compraId, dto);
  }

  @Patch('pagos/:id/estado')
  updatePagoEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePagoEstadoDto,
  ) {
    return this.service.updatePagoEstado(id, dto);
  }

  @Get('pagos/:id')
  getPago(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPago(id);
  }

  @Get('me/pagos')
  misPagos(
    @Req() req: { user?: { id?: number } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id ?? 1;
    return this.service.listPagosUsuario(userId, page, limit);
  }
}
