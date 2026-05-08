import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ReservaController } from './reserva.controller';
import { ReservaService } from './reserva.service';
import { LogroModule } from '../logro/logro.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Module({
  imports: [PassportModule, LogroModule],
  controllers: [ReservaController],
  providers: [ReservaService, PrismaService, JwtAuthGuard],
  exports: [ReservaService],
})
export class ReservaModule {}
