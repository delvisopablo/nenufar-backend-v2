import { Module } from '@nestjs/common';
import { ResenaController } from './resena.controller';
import { ResenaService } from './resena.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResenasAliasController } from './resenas-alias.controller';

@Module({
  controllers: [ResenaController, ResenasAliasController],
  providers: [ResenaService, PrismaService],
  exports: [ResenaService],
})
export class ResenaModule {}
