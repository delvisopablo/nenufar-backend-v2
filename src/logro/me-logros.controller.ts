import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateLogrosDestacadosDto } from './dto/update-logros-destacados.dto';
import { LogroService } from './logro.service';

@ApiTags('Mis Logros')
@UseGuards(AuthGuard)
@Controller('me/logros')
export class MeLogrosController {
  constructor(private readonly logroService: LogroService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get()
  list(@Req() req: { user?: { id?: number } }) {
    return this.logroService.misLogros(this.getAuthenticatedUserId(req));
  }

  @Get('resumen')
  resumen(@Req() req: { user?: { id?: number } }) {
    return this.logroService.resumenUsuario(this.getAuthenticatedUserId(req));
  }

  @Get('progreso')
  progreso(@Req() req: { user?: { id?: number } }) {
    return this.logroService.progresoUsuario(this.getAuthenticatedUserId(req));
  }

  @Get('destacados')
  destacados(@Req() req: { user?: { id?: number } }) {
    return this.logroService.logrosDestacados(
      this.getAuthenticatedUserId(req),
    );
  }

  @Put('destacados')
  actualizarDestacados(
    @Req() req: { user?: { id?: number } },
    @Body() dto: UpdateLogrosDestacadosDto,
  ) {
    return this.logroService.actualizarLogrosDestacados(
      this.getAuthenticatedUserId(req),
      dto.logroIds,
    );
  }

  @Get('desbloqueados')
  desbloqueados(@Req() req: { user?: { id?: number } }) {
    return this.logroService.logrosDesbloqueadosParaDestacar(
      this.getAuthenticatedUserId(req),
    );
  }
}
