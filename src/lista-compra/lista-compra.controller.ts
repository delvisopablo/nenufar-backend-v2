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
import { AddListaCompraItemDto } from './dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from './dto/update-lista-compra-item.dto';
import { ListaCompraService } from './lista-compra.service';

@Controller('lista-compra')
export class ListaCompraController {
  constructor(private readonly service: ListaCompraService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get()
  get(@Req() req: any) {
    return this.service.getLista(this.getAuthenticatedUserId(req));
  }

  @Post('items')
  addItem(@Body() dto: AddListaCompraItemDto, @Req() req: any) {
    return this.service.addItem(this.getAuthenticatedUserId(req), dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateListaCompraItemDto,
    @Req() req: any,
  ) {
    return this.service.updateItem(
      this.getAuthenticatedUserId(req),
      itemId,
      dto,
    );
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId', ParseIntPipe) itemId: number, @Req() req: any) {
    return this.service.removeItem(this.getAuthenticatedUserId(req), itemId);
  }

  @Delete('completados')
  removeCompleted(@Req() req: any) {
    return this.service.removeCompleted(this.getAuthenticatedUserId(req));
  }
}
