import { escapeHtml } from './html.util';
import { wrapReportDocument } from './empleabilidad.template';

export type PostulacionesPeriodoPdfData = {
  periodoLabel: string;
  kpis: { label: string; value: string }[];
  rows: {
    egresado: string;
    dni: string;
    oferta: string;
    empresa: string;
    estado: string;
    fecha: string;
  }[];
};

export function renderPostulacionesPeriodoReport(data: PostulacionesPeriodoPdfData, generatedAt: Date): string {
  const kpiHtml = data.kpis
    .map(
      (k) => `
    <div class="kpi">
      <div class="num">${escapeHtml(k.value)}</div>
      <div class="lbl">${escapeHtml(k.label)}</div>
    </div>`,
    )
    .join('');

  const tableRows = data.rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.egresado)}</td>
        <td>${escapeHtml(r.dni)}</td>
        <td>${escapeHtml(r.oferta)}</td>
        <td>${escapeHtml(r.empresa)}</td>
        <td>${escapeHtml(r.estado)}</td>
        <td>${escapeHtml(r.fecha)}</td>
      </tr>`,
    )
    .join('');

  const body = `
    <p style="color:#64748b;font-size:11px;margin:0 0 16px 0">${escapeHtml(data.periodoLabel)}</p>
    <div class="kpi-grid">${kpiHtml}</div>
    <div class="section-title">Movimientos</div>
    <table class="data">
      <thead><tr><th>Egresado</th><th>DNI</th><th>Oferta</th><th>Empresa</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;

  return wrapReportDocument({
    title: 'Postulaciones por periodo',
    generatedAt,
    bodyHtml: body,
  });
}
