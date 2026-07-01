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
import { UpdateEstadoPedidoDto } from './dto/update-estado-pedido.dto';
import { CancelarPedidoDto } from './dto/cancelar-pedido.dto';

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

  /** Detalle de pedido. Solo lo puede ver el usuario que lo creó o quien gestiona el negocio. */
  @Get('pedidos/:id')
  getPedido(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getPedido(id, this.getAuthenticatedUserId(req));
  }

  @Patch('pedidos/:id')
  updatePedido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePedidoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.updatePedido(id, this.getAuthenticatedUserId(req), dto);
  }

  /** Cambia el estado del pedido (completar/entregar/cancelar). Solo dueño/miembro del negocio o admin. */
  @Patch('pedidos/:id/estado')
  actualizarEstadoPedido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoPedidoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.actualizarEstadoPedido(
      id,
      this.getAuthenticatedUserId(req),
      dto.estado,
      dto.motivo,
    );
  }

  /** Cancela un pedido: lo puede cancelar el usuario que lo creó (Nenulista) o quien gestiona el negocio. */
  @Patch('pedidos/:id/cancelar')
  cancelarPedido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarPedidoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.cancelarPedido(
      id,
      this.getAuthenticatedUserId(req),
      dto.motivo,
    );
  }

  /** Pedidos del usuario autenticado (Nenulista / historial). */
  @Get('me/pedidos')
  misPedidos(
    @Req() req: { user?: { id?: number } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.misPedidos(
      this.getAuthenticatedUserId(req),
      page,
      limit,
    );
  }

  /** Historial de pedidos generados al cerrar listas de Mi Nenulista. */
  @Get('me/nenulista/pedidos')
  historialNenulista(@Req() req: { user?: { id?: number } }) {
    return this.service.listHistorialNenulista(
      this.getAuthenticatedUserId(req),
    );
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
    return this.service.createCompra(
      pedidoId,
      this.getAuthenticatedUserId(req),
      dto,
    );
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
    return this.service.listComprasUsuario(
      this.getAuthenticatedUserId(req),
      page,
      limit,
    );
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
    return this.service.listPagosUsuario(
      this.getAuthenticatedUserId(req),
      page,
      limit,
    );
  }
}
