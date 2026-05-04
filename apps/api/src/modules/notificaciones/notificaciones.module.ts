import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailService } from './email.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesGateway, EmailService],
  exports: [NotificacionesService, EmailService],
})
export class NotificacionesModule {}
