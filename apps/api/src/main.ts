import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as trpcExpress from '@trpc/server/adapters/express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression') as () => ReturnType<typeof import('compression')>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<typeof import('cookie-parser')>;
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ensureReportsStorageDir } from './lib/reports-storage';
import { ensureUploadsDirs } from './lib/uploads-storage';
import { EgresadosService } from './modules/egresados/egresados.service';
import { EmpresasService } from './modules/empresas/empresas.service';
import { EstadisticasService } from './modules/estadisticas/estadisticas.service';
import { HabilidadesService } from './modules/habilidades/habilidades.service';
import { OfertasService } from './modules/ofertas/ofertas.service';
import { NotificacionesService } from './modules/notificaciones/notificaciones.service';
import { PostulacionesService } from './modules/postulaciones/postulaciones.service';
import { ReportesService } from './modules/reportes/reportes.service';
import { PrismaService } from './prisma/prisma.service';
import { createTrpcContext } from './trpc/context';
import { appRouter } from './trpc/router';

async function bootstrap() {
  ensureReportsStorageDir();
  const { cvs: cvsDir, logos: logosDir } = ensureUploadsDirs();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  // Cookie parser (needed for HttpOnly JWT cookie)
  app.use(cookieParser());

  // Security headers
  app.use(
    helmet({
      // Allow same-origin iframes for reports preview
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // Response compression
  app.use(compression());

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  // Global validation — whitelist strips unknown fields, forbidNonWhitelisted rejects them
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logging interceptor and exception filter
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const reportsDir = ensureReportsStorageDir();
  app.useStaticAssets(reportsDir, { prefix: '/reports/' });
  app.useStaticAssets(cvsDir, { prefix: '/static/cvs/' });
  app.useStaticAssets(logosDir, { prefix: '/static/logos/' });

  const prisma = app.get(PrismaService);
  const reportes = app.get(ReportesService);
  const postulaciones = app.get(PostulacionesService);
  const notificaciones = app.get(NotificacionesService);
  const expressApp = app.getHttpAdapter().getInstance();

  const trpcServices = {
    egresados: new EgresadosService(prisma),
    empresas: new EmpresasService(prisma),
    habilidades: new HabilidadesService(prisma),
    ofertas: new OfertasService(prisma),
    postulaciones,
    estadisticas: new EstadisticasService(prisma),
    reportes,
    notificaciones,
  };

  expressApp.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) =>
        createTrpcContext({ req, res, prisma, services: trpcServices }),
    }),
  );

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
