import { escapeHtml, systemFooterName } from './html.util';

export type EmpleabilidadPdfData = {
  kpis: { label: string; value: string }[];
  cohortRows: { anio: string; egresados: number; contratados: number; tasa: string }[];
  topSkills: { nombre: string; demanda: number; tipo: string }[];
};

const baseStyles = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; font-size: 12px; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 6px 0; font-size: 20px; color: #1e3a5f; }
  .header .meta { color: #64748b; font-size: 11px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; background: #f8fafc; }
  .kpi .num { font-size: 22px; font-weight: 700; color: #1d4ed8; line-height: 1.2; }
  .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-top: 6px; }
  table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.data th { background: #e2e8f0; color: #334155; font-weight: 600; text-align: left; padding: 10px 8px; border: 1px solid #cbd5e1; font-size: 11px; }
  table.data td { padding: 8px; border: 1px solid #e2e8f0; }
  table.data tbody tr:nth-child(even) { background: #f8fafc; }
  .section-title { font-size: 13px; font-weight: 600; color: #0f172a; margin: 16px 0 8px 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
`;

export function wrapReportDocument(opts: {
  title: string;
  generatedAt: Date;
  bodyHtml: string;
}): string {
  const title = escapeHtml(opts.title);
  const when = opts.generatedAt.toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' });
  const footer = escapeHtml(systemFooterName());

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <header class="header">
    <h1>${title}</h1>
    <div class="meta">Generado el ${escapeHtml(when)}</div>
  </header>
  ${opts.bodyHtml}
  <footer class="footer">${footer}</footer>
</body>
</html>`;
}

export function renderEmpleabilidadReport(data: EmpleabilidadPdfData, generatedAt: Date): string {
  const kpiHtml = data.kpis
    .map(
      (k) => `
    <div class="kpi">
      <div class="num">${escapeHtml(k.value)}</div>
      <div class="lbl">${escapeHtml(k.label)}</div>
    </div>`,
    )
    .join('');

  const cohortRows = data.cohortRows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.anio)}</td>
      <td style="text-align:right">${r.egresados}</td>
      <td style="text-align:right">${r.contratados}</td>
      <td style="text-align:right">${escapeHtml(r.tasa)}</td>
    </tr>`,
    )
    .join('');

  const skillRows = data.topSkills
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(r.tipo)}</td>
      <td style="text-align:right">${r.demanda}</td>
    </tr>`,
    )
    .join('');

  const body = `
  <div class="kpi-grid">${kpiHtml}</div>
  <div class="section-title">Tasa de contratación por cohorte (año de egreso)</div>
  <table class="data">
    <thead><tr><th>Cohorte</th><th style="text-align:right">Egresados</th><th style="text-align:right">Contratados</th><th style="text-align:right">Tasa %</th></tr></thead>
    <tbody>${cohortRows}</tbody>
  </table>
  <div class="section-title">Habilidades más demandadas en ofertas activas</div>
  <table class="data">
    <thead><tr><th>Habilidad</th><th>Tipo</th><th style="text-align:right">Ofertas</th></tr></thead>
    <tbody>${skillRows}</tbody>
  </table>`;

  return wrapReportDocument({
    title: 'Reporte de empleabilidad',
    generatedAt,
    bodyHtml: body,
  });
}
