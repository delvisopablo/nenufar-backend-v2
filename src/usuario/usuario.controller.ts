import {
  Controller,
  Post,
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

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

  @Post()
  async crearUsuario(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.crearUsuario(dto);
  }

  @Get(':id/seguidores')
  async getSeguidores(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.getSeguidores(id, this.getOptionalUserId(req));
  }

  @Get(':id/siguiendo')
  async getSiguiendo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.getSiguiendo(id, this.getOptionalUserId(req));
  }

  @Post(':id/seguir')
  async seguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.seguir(id, this.getAuthenticatedUserId(req));
  }

  @Delete(':id/seguir')
  async dejarDeSeguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.dejarDeSeguir(
      id,
      this.getAuthenticatedUserId(req),
    );
  }

  @Get(':id')
  async getPerfil(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.getPerfil(id);
  }

  @Patch(':id')
  async actualizarPerfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.actualizarPerfil(
      id,
      dto,
      this.getAuthenticatedUserId(req),
    );
  }

  @Delete(':id')
  async borrarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    const actorId = this.getAuthenticatedUserId(req);
    if (actorId !== id) {
      throw new UnauthorizedException('Solo puedes borrar tu propia cuenta');
    }
    return this.usuarioService.borrarUsuario(id);
  }
}
