import { escapeHtml } from './html.util';
import { wrapReportDocument } from './empleabilidad.template';

export type ComparativoCohortesPdfData = {
  kpis: { label: string; value: string }[];
  rows: { cohorte: string; egresados: number; contratados: number; tasa: string }[];
};

export function renderComparativoCohortesReport(data: ComparativoCohortesPdfData, generatedAt: Date): string {
  const kpiHtml = data.kpis
    .map(
      (k) => `
    <div class="kpi">
      <div class="num">${escapeHtml(k.value)}</div>
      <div class="lbl">${escapeHtml(k.label)}</div>
    </div>`,
    )
    .join('');

  const rowHtml = data.rows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.cohorte)}</td>
      <td style="text-align:right">${r.egresados}</td>
      <td style="text-align:right">${r.contratados}</td>
      <td style="text-align:right">${escapeHtml(r.tasa)}</td>
    </tr>`,
    )
    .join('');

  const body = `
  <p style="color:#64748b;font-size:11px;margin:0 0 16px 0">
    Comparativo de cohortes según año de egreso y contrataciones registradas en la plataforma.
  </p>
  <div class="kpi-grid">${kpiHtml}</div>
  <div class="section-title">Egresados vs contratados por cohorte</div>
  <table class="data">
    <thead>
      <tr>
        <th>Cohorte (año egreso)</th>
        <th style="text-align:right">Egresados</th>
        <th style="text-align:right">Contratados</th>
        <th style="text-align:right">Tasa %</th>
      </tr>
    </thead>
    <tbody>${rowHtml}</tbody>
  </table>`;

  return wrapReportDocument({
    title: 'Comparativo de cohortes',
    generatedAt,
    bodyHtml: body,
  });
}
