import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionModule } from '../notificacion/notificacion.module';
import { ListaCompraController } from './lista-compra.controller';
import { MisListasController } from './mis-listas.controller';
import { ListasCodigoController } from './listas-codigo.controller';
import { ListaCompraService } from './lista-compra.service';

@Module({
  imports: [NotificacionModule],
  controllers: [
    ListaCompraController,
    MisListasController,
    ListasCodigoController,
  ],
  providers: [ListaCompraService, PrismaService],
  exports: [ListaCompraService],
})
export class ListaCompraModule {}
