import { router, publicProcedure } from '../trpc';
import { egresadosRouter } from './egresados.router';
import { empresasRouter } from './empresas.router';
import { estadisticasRouter } from './estadisticas.router';
import { habilidadesRouter } from './habilidades.router';
import { notificacionesRouter } from './notificaciones.router';
import { ofertasRouter } from './ofertas.router';
import { postulacionesRouter } from './postulaciones.router';
import { reportesRouter } from './reportes.router';

export const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true as const,
    service: 'trpc',
    timestamp: new Date().toISOString(),
  })),

  egresados: egresadosRouter,
  empresas: empresasRouter,
  habilidades: habilidadesRouter,
  ofertas: ofertasRouter,
  postulaciones: postulacionesRouter,
  estadisticas: estadisticasRouter,
  reportes: reportesRouter,
  notificaciones: notificacionesRouter,
});

export type AppRouter = typeof appRouter;
