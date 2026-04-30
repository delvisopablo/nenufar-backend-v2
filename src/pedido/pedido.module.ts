import { Module } from '@nestjs/common';
import { PedidoController } from './pedido.controller';
import { PedidoService } from './pedido.service';
import { LogroModule } from '../logro/logro.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [LogroModule],
  controllers: [PedidoController],
  providers: [PedidoService, PrismaService],
  exports: [PedidoService],
})
export class PedidoModule {}
