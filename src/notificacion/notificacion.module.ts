import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { NotificacionController } from './notificacion.controller';
import { NotificacionService } from './notificacion.service';

@Module({
  imports: [CommonModule],
  controllers: [NotificacionController],
  providers: [NotificacionService],
  exports: [NotificacionService],
})
export class NotificacionModule {}
