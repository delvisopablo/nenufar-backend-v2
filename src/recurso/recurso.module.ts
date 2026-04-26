import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecursoController } from './recurso.controller';
import { RecursoService } from './recurso.service';

@Module({
  controllers: [RecursoController],
  providers: [RecursoService, PrismaService],
  exports: [RecursoService],
})
export class RecursoModule {}
