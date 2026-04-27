import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { DashboardRangeDto } from './dto/dashboard-range.dto';
import { DashboardService } from './dashboard.service';

@Controller('negocios/:id/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get('resumen')
  getResumen(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getResumen(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('ventas')
  getVentas(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getVentas(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('ingresos')
  getIngresos(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getIngresos(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('pedidos')
  getPedidos(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getPedidos(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('reservas')
  getReservas(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getReservas(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('productos')
  getProductos(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getProductos(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('clientes')
  getClientes(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getClientes(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('conversion')
  getConversion(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getConversion(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('categorias')
  getCategorias(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() query: DashboardRangeDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.getCategorias(
      negocioId,
      this.getAuthenticatedUserId(req),
      query,
    );
  }
}
