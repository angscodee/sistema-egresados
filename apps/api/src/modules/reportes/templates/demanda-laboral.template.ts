import { escapeHtml } from './html.util';
import { wrapReportDocument } from './empleabilidad.template';

export type DemandaLaboralPdfData = {
  kpis: { label: string; value: string }[];
  ofertasRows: {
    titulo: string;
    empresa: string;
    modalidad: string;
    salario: string;
    publicada: string;
  }[];
  modalidadRows: { modalidad: string; total: number }[];
};

const extraStyles = `
  .sub { color: #64748b; font-size: 11px; margin-bottom: 16px; }
`;

export type DemandaLaboralRenderOpts = {
  documentTitle?: string;
  subtitle?: string;
};

export function renderDemandaLaboralReport(
  data: DemandaLaboralPdfData,
  generatedAt: Date,
  opts?: DemandaLaboralRenderOpts,
): string {
  const documentTitle = opts?.documentTitle ?? 'Reporte de demanda laboral';
  const subtitle =
    opts?.subtitle ?? 'Demanda laboral registrada en la plataforma (ofertas y distribución).';

  const kpiHtml = data.kpis
    .map(
      (k) => `
    <div class="kpi">
      <div class="num">${escapeHtml(k.value)}</div>
      <div class="lbl">${escapeHtml(k.label)}</div>
    </div>`,
    )
    .join('');

  const modRows = data.modalidadRows
    .map(
      (r) => `
    <tr><td>${escapeHtml(r.modalidad)}</td><td style="text-align:right">${r.total}</td></tr>`,
    )
    .join('');

  const ofertaRows = data.ofertasRows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.titulo)}</td>
      <td>${escapeHtml(r.empresa)}</td>
      <td>${escapeHtml(r.modalidad)}</td>
      <td>${escapeHtml(r.salario)}</td>
      <td>${escapeHtml(r.publicada)}</td>
    </tr>`,
    )
    .join('');

  const body = `
  <style>${extraStyles}</style>
  <p class="sub">${escapeHtml(subtitle)}</p>
  <div class="kpi-grid">${kpiHtml}</div>
  <div class="section-title">Ofertas por modalidad</div>
  <table class="data">
    <thead><tr><th>Modalidad</th><th style="text-align:right">Cantidad</th></tr></thead>
    <tbody>${modRows}</tbody>
  </table>
  <div class="section-title">Detalle de ofertas activas</div>
  <table class="data">
    <thead><tr><th>Título</th><th>Empresa</th><th>Modalidad</th><th>Rango salarial</th><th>Publicación</th></tr></thead>
    <tbody>${ofertaRows}</tbody>
  </table>`;

  return wrapReportDocument({
    title: documentTitle,
    generatedAt,
    bodyHtml: body,
  });
}
