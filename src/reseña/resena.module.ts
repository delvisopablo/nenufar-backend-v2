import { Module } from '@nestjs/common';
import { ResenaController } from './resena.controller';
import { ResenaService } from './resena.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResenasAliasController } from './resenas-alias.controller';
import { LogroModule } from '../logro/logro.module';
import { NotificacionModule } from '../notificacion/notificacion.module';

@Module({
  imports: [NotificacionModule, LogroModule],
  controllers: [ResenaController, ResenasAliasController],
  providers: [ResenaService, PrismaService],
  exports: [ResenaService],
})
export class ResenaModule {}
