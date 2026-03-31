import { Body, Controller, Post, Req } from '@nestjs/common';
import { ResenaService } from './resena.service';
import { CreateResenaDto } from './dto/create-resena.dto';

@Controller('resenas')
export class ResenasAliasController {
  constructor(private readonly resenaService: ResenaService) {}

  @Post()
  crear(@Body() dto: CreateResenaDto, @Req() req: any) {
    const userId: number = typeof req.user?.id === 'number' ? req.user.id : 1;
    return this.resenaService.crear(userId, dto);
  }
}
