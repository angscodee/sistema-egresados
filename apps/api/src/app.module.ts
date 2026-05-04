import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createBullConnection } from './lib/redis-bull';
import { AuthModule } from './modules/auth/auth.module';
import { EgresadosModule } from './modules/egresados/egresados.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { EstadisticasModule } from './modules/estadisticas/estadisticas.module';
import { HabilidadesModule } from './modules/habilidades/habilidades.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { OfertasModule } from './modules/ofertas/ofertas.module';
import { PostulacionesModule } from './modules/postulaciones/postulaciones.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: createBullConnection(),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute window
        limit: 100,  // 100 requests per IP per minute
      },
    ]),
    AuthModule,
    EgresadosModule,
    EmpresasModule,
    HabilidadesModule,
    OfertasModule,
    NotificacionesModule,
    PostulacionesModule,
    EstadisticasModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
