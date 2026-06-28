import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NegocioModule } from '../negocio/negocio.module';
import { ProductoModule } from '../producto/producto.module';
import { PromocionModule } from '../promocion/promocion.module';

@Module({
  imports: [PrismaModule, NegocioModule, ProductoModule, PromocionModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
