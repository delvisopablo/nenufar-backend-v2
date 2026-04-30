import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { NotificacionModule } from '../notificacion/notificacion.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LogroController } from './logro.controller';
import { LogroEngineService } from './logro-engine.service';
import { LogroService } from './logro.service';
import { MeLogrosController } from './me-logros.controller';

@Module({
  imports: [PrismaModule, CommonModule, NotificacionModule],
  controllers: [LogroController, MeLogrosController],
  providers: [LogroService, LogroEngineService],
  exports: [LogroService, LogroEngineService],
})
export class LogroModule {}
