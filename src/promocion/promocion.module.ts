import { Module } from '@nestjs/common';
import { PromocionService } from './promocion.service';
import { PromocionController } from './promocion.controller';
import { LogroModule } from '../logro/logro.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { NotificacionModule } from '../notificacion/notificacion.module';

@Module({
  imports: [PrismaModule, CommonModule, NotificacionModule, LogroModule],
  controllers: [PromocionController],
  providers: [PromocionService],
  exports: [PromocionService],
})
export class PromocionModule {}
