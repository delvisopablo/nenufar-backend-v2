import { Module } from '@nestjs/common';
import { NegocioController } from './negocio.controller';
import { NegocioService } from './negocio.service';
import { LogroModule } from '../logro/logro.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ResenaModule } from '../reseña/resena.module';
import { PromocionModule } from '../promocion/promocion.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ResenaModule, PromocionModule, LogroModule],
  controllers: [NegocioController],
  providers: [NegocioService, PrismaService],
  exports: [NegocioService],
})
export class NegocioModule {}
