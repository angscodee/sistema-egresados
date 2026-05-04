import type { DemandaLaboralPdfData } from './demanda-laboral.template';
import { renderDemandaLaboralReport } from './demanda-laboral.template';

export type OfertasActivasPdfData = DemandaLaboralPdfData;

export function renderOfertasActivasReport(data: OfertasActivasPdfData, generatedAt: Date): string {
  return renderDemandaLaboralReport(data, generatedAt, {
    documentTitle: 'Reporte de ofertas activas',
    subtitle: 'Vacantes vigentes en la plataforma y su distribución por modalidad.',
  });
}
