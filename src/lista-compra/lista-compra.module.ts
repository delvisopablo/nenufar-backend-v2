import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListaCompraController } from './lista-compra.controller';
import { ListaCompraService } from './lista-compra.service';

@Module({
  controllers: [ListaCompraController],
  providers: [ListaCompraService, PrismaService],
  exports: [ListaCompraService],
})
export class ListaCompraModule {}
