import { Module } from '@nestjs/common';
import { ReservaController } from './reserva.controller';
import { ReservaService } from './reserva.service';
import { LogroModule } from '../logro/logro.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [LogroModule],
  controllers: [ReservaController],
  providers: [ReservaService, PrismaService],
  exports: [ReservaService],
})
export class ReservaModule {}
