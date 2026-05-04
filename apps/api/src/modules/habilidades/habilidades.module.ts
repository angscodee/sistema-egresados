import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { HabilidadesController } from './habilidades.controller';
import { HabilidadesService } from './habilidades.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HabilidadesController],
  providers: [HabilidadesService],
  exports: [HabilidadesService],
})
export class HabilidadesModule {}
