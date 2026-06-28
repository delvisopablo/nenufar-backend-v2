import { Module } from '@nestjs/common';
import { ProductoController } from './producto.controller';
import { ProductoService } from './producto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ListaCompraModule } from '../lista-compra/lista-compra.module';
import { LogroModule } from '../logro/logro.module';

@Module({
  imports: [ListaCompraModule, LogroModule],
  controllers: [ProductoController],
  providers: [ProductoService, PrismaService],
  exports: [ProductoService],
})
export class ProductoModule {}
