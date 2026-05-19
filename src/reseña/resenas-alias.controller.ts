import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ResenaService } from './resena.service';
import { CreateResenaDto } from './dto/create-resena.dto';

@Controller('resenas')
export class ResenasAliasController {
  constructor(private readonly resenaService: ResenaService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Post()
  crear(@Body() dto: CreateResenaDto, @Req() req: any) {
    return this.resenaService.crear(this.getAuthenticatedUserId(req), dto);
  }
}
