import { Module } from '@nestjs/common';
import { NegocioController } from './negocio.controller';
import { NegocioService } from './negocio.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResenaModule } from '../reseña/resena.module';

@Module({
  imports: [ResenaModule],
  controllers: [NegocioController],
  providers: [NegocioService, PrismaService],
  exports: [NegocioService],
})
export class NegocioModule {}
