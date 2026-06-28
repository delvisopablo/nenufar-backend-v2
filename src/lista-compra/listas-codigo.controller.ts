import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListaCompraService } from './lista-compra.service';

@ApiTags('Listas por código')
@Controller('listas/codigo')
export class ListasCodigoController {
  constructor(private readonly service: ListaCompraService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get(':codigo')
  preview(@Param('codigo') codigo: string, @Req() req: any) {
    this.getAuthenticatedUserId(req);
    return this.service.previewCodigo(codigo);
  }
}
