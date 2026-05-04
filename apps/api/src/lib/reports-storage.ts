import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/** Directorio absoluto donde se guardan los PDF (p. ej. `/workspace/storage/reports` en contenedores). */
export function getReportsStorageDir(): string {
  const fromEnv = process.env.REPORTS_STORAGE_DIR?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const workspaceDefault = '/workspace/storage/reports';
  if (process.platform !== 'win32' && existsSync(workspaceDefault)) {
    return workspaceDefault;
  }
  return join(process.cwd(), 'storage', 'reports');
}

export function ensureReportsStorageDir(): string {
  const dir = getReportsStorageDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}
