import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateRecursoDto } from './dto/create-recurso.dto';
import { UpdateRecursoDto } from './dto/update-recurso.dto';
import { RecursoService } from './recurso.service';

@Controller()
export class RecursoController {
  constructor(private readonly service: RecursoService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get('negocios/:id/recursos')
  listByNegocio(
    @Param('id', ParseIntPipe) negocioId: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.listByNegocio(
      negocioId,
      this.getAuthenticatedUserId(req),
    );
  }

  @Post('negocios/:id/recursos')
  create(
    @Param('id', ParseIntPipe) negocioId: number,
    @Body() dto: CreateRecursoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.create(
      negocioId,
      this.getAuthenticatedUserId(req),
      dto,
    );
  }

  @Patch('recursos/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecursoDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.update(id, this.getAuthenticatedUserId(req), dto);
  }

  @Delete('recursos/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.service.remove(id, this.getAuthenticatedUserId(req));
  }
}
