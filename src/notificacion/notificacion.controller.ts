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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { QueryNotificacionesDto } from './dto/query-notificaciones.dto';
import { UpdateNotificacionDto } from './dto/update-notificacion.dto';
import { NotificacionService } from './notificacion.service';

@ApiTags('Notificaciones')
@UseGuards(AuthGuard)
@Controller('me/notificaciones')
export class NotificacionController {
  constructor(private readonly notificacionService: NotificacionService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get()
  list(
    @Query() query: QueryNotificacionesDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.notificacionService.listForUser(
      this.getAuthenticatedUserId(req),
      query,
    );
  }

  @Get('no-leidas/count')
  countUnread(@Req() req: { user?: { id?: number } }) {
    return this.notificacionService.countUnreadForUser(
      this.getAuthenticatedUserId(req),
    );
  }

  @Patch(':id')
  updateReadState(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificacionDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.notificacionService.updateReadState(
      this.getAuthenticatedUserId(req),
      id,
      dto.leida,
    );
  }

  @Post('leer-todas')
  markAllAsRead(@Req() req: { user?: { id?: number } }) {
    return this.notificacionService.markAllAsRead(
      this.getAuthenticatedUserId(req),
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.notificacionService.removeForUser(
      this.getAuthenticatedUserId(req),
      id,
    );
  }
}
