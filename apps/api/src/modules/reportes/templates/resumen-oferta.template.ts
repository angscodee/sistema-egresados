import { escapeHtml } from './html.util';
import { wrapReportDocument } from './empleabilidad.template';

export type ResumenOfertaPdfData = {
  oferta: {
    titulo: string;
    empresa: string;
    modalidad: string;
    tipoContrato: string;
    ubicacion?: string | null;
    salarioMin?: number | null;
    salarioMax?: number | null;
    fechaPublicacion: string;
    fechaCierre?: string | null;
    estado: string;
    descripcion: string;
  };
  kpis: { label: string; value: string }[];
  contratados: {
    nombre: string;
    dni: string;
    carrera: string;
    anioEgreso: string;
    telefono: string;
    email: string;
  }[];
  estadoResumen: { estado: string; total: number }[];
};

export function renderResumenOfertaReport(data: ResumenOfertaPdfData, generatedAt: Date): string {
  const kpiHtml = data.kpis
    .map(
      (k) => `
    <div class="kpi">
      <div class="num">${escapeHtml(k.value)}</div>
      <div class="lbl">${escapeHtml(k.label)}</div>
    </div>`,
    )
    .join('');

  const salario =
    data.oferta.salarioMin != null || data.oferta.salarioMax != null
      ? `S/ ${data.oferta.salarioMin ?? '—'} – ${data.oferta.salarioMax ?? '—'}`
      : 'No especificado';

  const estadoRows = data.estadoResumen
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.estado)}</td>
        <td style="text-align:center;font-weight:600">${r.total}</td>
      </tr>`,
    )
    .join('');

  const contratadosRows = data.contratados.length
    ? data.contratados
        .map(
          (c) => `
      <tr>
        <td>${escapeHtml(c.nombre)}</td>
        <td>${escapeHtml(c.dni)}</td>
        <td>${escapeHtml(c.carrera)}</td>
        <td style="text-align:center">${escapeHtml(c.anioEgreso)}</td>
        <td>${escapeHtml(c.telefono)}</td>
        <td>${escapeHtml(c.email)}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="6" style="text-align:center;color:#94a3b8">Sin contratados registrados</td></tr>`;

  const body = `
    <!-- Oferta info -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr>
          <td style="padding:4px 8px;color:#64748b;width:140px">Empresa</td>
          <td style="padding:4px 8px;font-weight:600">${escapeHtml(data.oferta.empresa)}</td>
          <td style="padding:4px 8px;color:#64748b;width:140px">Modalidad</td>
          <td style="padding:4px 8px">${escapeHtml(data.oferta.modalidad)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;color:#64748b">Tipo contrato</td>
          <td style="padding:4px 8px">${escapeHtml(data.oferta.tipoContrato.replace(/_/g, ' '))}</td>
          <td style="padding:4px 8px;color:#64748b">Salario</td>
          <td style="padding:4px 8px">${escapeHtml(salario)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;color:#64748b">Ubicación</td>
          <td style="padding:4px 8px">${escapeHtml(data.oferta.ubicacion ?? '—')}</td>
          <td style="padding:4px 8px;color:#64748b">Estado</td>
          <td style="padding:4px 8px;font-weight:600;color:${data.oferta.estado === 'CERRADA' ? '#dc2626' : '#16a34a'}">${escapeHtml(data.oferta.estado)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px;color:#64748b">Publicada</td>
          <td style="padding:4px 8px">${escapeHtml(data.oferta.fechaPublicacion)}</td>
          <td style="padding:4px 8px;color:#64748b">Cierre</td>
          <td style="padding:4px 8px">${escapeHtml(data.oferta.fechaCierre ?? '—')}</td>
        </tr>
      </table>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">${kpiHtml}</div>

    <!-- Resumen por estado -->
    <div class="section-title">Postulaciones por estado</div>
    <table class="data" style="max-width:320px">
      <thead><tr><th>Estado</th><th style="text-align:center">Total</th></tr></thead>
      <tbody>${estadoRows}</tbody>
    </table>

    <!-- Contratados -->
    <div class="section-title" style="margin-top:24px">Candidatos contratados</div>
    <table class="data">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>DNI</th>
          <th>Carrera</th>
          <th style="text-align:center">Año egreso</th>
          <th>Teléfono</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>${contratadosRows}</tbody>
    </table>`;

  return wrapReportDocument({
    title: `Resumen de oferta: ${data.oferta.titulo}`,
    generatedAt,
    bodyHtml: body,
  });
}
