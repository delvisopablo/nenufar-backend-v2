import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoriaController } from './subcategoria.controller';
import { SubcategoriaService } from './subcategoria.service';

@Module({
  controllers: [SubcategoriaController],
  providers: [SubcategoriaService, PrismaService],
  exports: [SubcategoriaService],
})
export class SubcategoriaModule {}
