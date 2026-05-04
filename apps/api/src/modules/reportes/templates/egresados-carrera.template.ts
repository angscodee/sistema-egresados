import { escapeHtml } from './html.util';
import { wrapReportDocument } from './empleabilidad.template';

export type EgresadosCarreraPdfData = {
  filtroCarrera: string;
  filtroAnio: string | null;
  kpis: { label: string; value: string }[];
  rows: {
    nombre: string;
    dni: string;
    carrera: string;
    anioEgreso: string;
    telefono: string;
  }[];
};

export function renderEgresadosCarreraReport(data: EgresadosCarreraPdfData, generatedAt: Date): string {
  const filtros = `Carrera: ${data.filtroCarrera}${data.filtroAnio ? ` · Año egreso: ${data.filtroAnio}` : ''}`;

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
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(r.dni)}</td>
      <td>${escapeHtml(r.carrera)}</td>
      <td>${escapeHtml(r.anioEgreso)}</td>
      <td>${escapeHtml(r.telefono)}</td>
    </tr>`,
    )
    .join('');

  const body = `
  <p style="color:#64748b;font-size:11px;margin:0 0 16px 0">${escapeHtml(filtros)}</p>
  <div class="kpi-grid">${kpiHtml}</div>
  <div class="section-title">Egresados</div>
  <table class="data">
    <thead><tr><th>Nombre</th><th>DNI</th><th>Carrera</th><th>Año egreso</th><th>Teléfono</th></tr></thead>
    <tbody>${rowHtml}</tbody>
  </table>`;

  return wrapReportDocument({
    title: 'Reporte de egresados por carrera',
    generatedAt,
    bodyHtml: body,
  });
}
