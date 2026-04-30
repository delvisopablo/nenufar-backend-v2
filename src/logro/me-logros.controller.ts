import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
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

  @Get('progreso')
  progreso(@Req() req: { user?: { id?: number } }) {
    return this.logroService.progresoUsuario(this.getAuthenticatedUserId(req));
  }
}
