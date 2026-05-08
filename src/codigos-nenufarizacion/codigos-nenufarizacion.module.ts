import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodigosNenufarizacionController } from './codigos-nenufarizacion.controller';
import { CodigosNenufarizacionService } from './codigos-nenufarizacion.service';

@Module({
  controllers: [CodigosNenufarizacionController],
  providers: [CodigosNenufarizacionService, PrismaService],
  exports: [CodigosNenufarizacionService],
})
export class CodigosNenufarizacionModule {}
