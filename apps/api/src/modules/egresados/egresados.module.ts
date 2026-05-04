import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EgresadosController } from './egresados.controller';
import { EgresadosService } from './egresados.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EgresadosController],
  providers: [EgresadosService],
  exports: [EgresadosService],
})
export class EgresadosModule {}
