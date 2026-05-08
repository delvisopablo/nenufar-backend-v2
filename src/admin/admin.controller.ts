import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolGlobal } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminActionDto } from './dto/admin-action.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolGlobal.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  listUsuarios() {
    return this.adminService.listUsuarios();
  }

  @Delete('usuarios/:id')
  eliminarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.eliminarUsuario(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('usuarios/:id/suspender')
  suspenderUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.suspenderUsuario(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('usuarios/:id/activar')
  activarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.activarUsuario(this.getAdminId(req), id, dto?.motivo);
  }

  @Get('negocios')
  listNegocios() {
    return this.adminService.listNegocios();
  }

  @Delete('negocios/:id')
  eliminarNegocio(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.eliminarNegocio(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('negocios/:id/activar')
  activarNegocio(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.activarNegocio(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('negocios/:id/desactivar')
  desactivarNegocio(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.desactivarNegocio(this.getAdminId(req), id, dto?.motivo);
  }

  @Get('resenas')
  listResenas() {
    return this.adminService.listResenas();
  }

  @Delete('resenas/:id')
  eliminarResena(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.eliminarResena(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('resenas/:id/ocultar')
  ocultarResena(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.ocultarResena(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('resenas/:id/publicar')
  publicarResena(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.publicarResena(this.getAdminId(req), id, dto?.motivo);
  }

  @Get('promociones')
  listPromociones() {
    return this.adminService.listPromociones();
  }

  @Delete('promociones/:id')
  eliminarPromocion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.eliminarPromocion(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('promociones/:id/ocultar')
  ocultarPromocion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.ocultarPromocion(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('promociones/:id/publicar')
  publicarPromocion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.publicarPromocion(this.getAdminId(req), id, dto?.motivo);
  }

  @Get('reservas')
  listReservas() {
    return this.adminService.listReservas();
  }

  @Delete('reservas/:id')
  eliminarReserva(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.eliminarReserva(this.getAdminId(req), id, dto?.motivo);
  }

  @Patch('reservas/:id/cancelar')
  cancelarReserva(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.cancelarReserva(this.getAdminId(req), id, dto?.motivo);
  }

  @Get('logs')
  listLogs() {
    return this.adminService.listLogs();
  }

  private getAdminId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }
}
