import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { MeController } from './me.controller';
import { FavoritosService } from './favoritos.service';
import { NenulistaService } from './nenulista.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LogroModule } from '../logro/logro.module';
import { ListaCompraModule } from '../lista-compra/lista-compra.module';

@Module({
  imports: [PrismaModule, LogroModule, ListaCompraModule],
  controllers: [UsuarioController, MeController],
  providers: [UsuarioService, FavoritosService, NenulistaService],
  exports: [UsuarioService, FavoritosService, NenulistaService],
})
export class UsuarioModule {}
