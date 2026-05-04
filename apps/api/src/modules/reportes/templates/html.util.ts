export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function systemFooterName(): string {
  return process.env.SYSTEM_DISPLAY_NAME?.trim() || 'Sistema de Gestión de Egresados';
}
