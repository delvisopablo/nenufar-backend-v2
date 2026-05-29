import { Injectable } from '@nestjs/common';
import { ListaCompraService } from '../lista-compra/lista-compra.service';
import { AddListaCompraItemDto } from '../lista-compra/dto/add-lista-compra-item.dto';
import { UpdateListaCompraItemDto } from '../lista-compra/dto/update-lista-compra-item.dto';

@Injectable()
export class NenulistaService {
  constructor(private readonly listaCompraService: ListaCompraService) {}

  getNenulista(usuarioId: number) {
    return this.listaCompraService.getLista(usuarioId);
  }

  getOrCreateNenulista(usuarioId: number) {
    return this.listaCompraService.getLista(usuarioId);
  }

  addProducto(usuarioId: number, dto: AddListaCompraItemDto) {
    return this.listaCompraService.addItem(usuarioId, dto);
  }

  updateItem(usuarioId: number, itemId: number, dto: UpdateListaCompraItemDto) {
    return this.listaCompraService.updateItem(usuarioId, itemId, dto);
  }

  deleteItem(usuarioId: number, itemId: number) {
    return this.listaCompraService.removeItem(usuarioId, itemId);
  }

  clearCompletados(usuarioId: number) {
    return this.listaCompraService.removeCompleted(usuarioId);
  }
}
