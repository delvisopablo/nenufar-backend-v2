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
import { ApiTags } from '@nestjs/swagger';
import { FavoritosService } from './favoritos.service';
import { AddProductoFavoritoDto } from './dto/add-producto-favorito.dto';
import { ListaCompraService } from '../lista-compra/lista-compra.service';
import { AddListaCompraItemDto } from '../lista-compra/dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from '../lista-compra/dto/update-lista-compra-item.dto';

@ApiTags('Me')
@Controller('me')
export class MeController {
  constructor(
    private readonly favoritosService: FavoritosService,
    private readonly listaCompraService: ListaCompraService,
  ) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }): number {
    const userId = Number(req?.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  // ===== FAVORITOS =====

  @Get('productos-favoritos')
  getFavoritos(@Req() req: any) {
    return this.favoritosService.getFavoritos(this.getAuthenticatedUserId(req));
  }

  @Post('productos-favoritos')
  addFavorito(@Body() dto: AddProductoFavoritoDto, @Req() req: any) {
    return this.favoritosService.addFavorito(
      this.getAuthenticatedUserId(req),
      dto.productoId,
    );
  }

  @Delete('productos-favoritos/:productoId')
  deleteFavorito(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Req() req: any,
  ) {
    return this.favoritosService.deleteFavorito(
      this.getAuthenticatedUserId(req),
      productoId,
    );
  }

  // ===== NENULISTA (Lista de la compra) =====

  @Get('lista-compra')
  getLista(@Req() req: any) {
    return this.listaCompraService.getLista(this.getAuthenticatedUserId(req));
  }

  @Post('lista-compra')
  addItem(@Body() dto: AddListaCompraItemDto, @Req() req: any) {
    return this.listaCompraService.addItem(this.getAuthenticatedUserId(req), dto);
  }

  @Delete('lista-compra/completados')
  clearCompletados(@Req() req: any) {
    return this.listaCompraService.removeCompleted(
      this.getAuthenticatedUserId(req),
    );
  }

  @Patch('lista-compra/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateListaCompraItemDto,
    @Req() req: any,
  ) {
    return this.listaCompraService.updateItem(
      this.getAuthenticatedUserId(req),
      itemId,
      dto,
    );
  }

  @Delete('lista-compra/:itemId')
  deleteItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: any,
  ) {
    return this.listaCompraService.removeItem(
      this.getAuthenticatedUserId(req),
      itemId,
    );
  }

  // ===== RUTA LOCAL =====

  @Get('ruta-local')
  async getRutaLocal(@Req() req: any) {
    const userId = this.getAuthenticatedUserId(req);
    const lista = await this.listaCompraService.getLista(userId);
    const pendientes = lista.items.filter((item) => !item.completado);

    const negociosMap = new Map<number, { negocio: unknown; items: unknown[] }>();
    const manuales: unknown[] = [];

    for (const item of pendientes) {
      const producto = (item as any).producto as
        | { negocio?: { id?: number } }
        | null
        | undefined;
      const negocio = producto?.negocio;

      if (negocio?.id) {
        const id = negocio.id;
        if (!negociosMap.has(id)) {
          negociosMap.set(id, { negocio, items: [] });
        }
        negociosMap.get(id)!.items.push(item);
      } else {
        manuales.push(item);
      }
    }

    return {
      negocios: Array.from(negociosMap.values()),
      manuales,
    };
  }
}
