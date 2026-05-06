import {
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { NenufarizarService } from './nenufarizar.service';

@ApiTags('Nenufarizar')
@UseGuards(AuthGuard)
@Controller('usuarios/me')
export class NenufarizarController {
  constructor(private readonly nenufarizarService: NenufarizarService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    return userId;
  }

  @Get('codigo-referido')
  async generarCodigo(@Req() req: { user?: { id?: number } }) {
    return {
      codigoReferido: await this.nenufarizarService.generarCodigo(
        this.getAuthenticatedUserId(req),
      ),
    };
  }

  @Post('codigo-referido/regenerar')
  async regenerarCodigo(@Req() req: { user?: { id?: number } }) {
    return {
      codigoReferido: await this.nenufarizarService.regenerarCodigo(
        this.getAuthenticatedUserId(req),
      ),
    };
  }

  @Get('referidos')
  obtenerReferidos(@Req() req: { user?: { id?: number } }) {
    return this.nenufarizarService.obtenerReferidos(
      this.getAuthenticatedUserId(req),
    );
  }
}
