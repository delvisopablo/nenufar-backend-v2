import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
// Make sure the path is correct; update as needed if the file is elsewhere
import { PrismaModule } from '../../prisma/prisma.module';
import { LogroModule } from '../logro/logro.module';

@Module({
  imports: [PrismaModule, LogroModule],
  controllers: [UsuarioController],
  providers: [UsuarioService],
  exports: [UsuarioService],
})
export class UsuarioModule {}
