import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NenufarizarController } from './nenufarizar.controller';
import { NenufarizarService } from './nenufarizar.service';

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [NenufarizarController],
  providers: [NenufarizarService],
  exports: [NenufarizarService],
})
export class NenufarizarModule {}
