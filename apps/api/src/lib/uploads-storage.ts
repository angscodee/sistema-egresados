import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function getUploadsBaseDir(): string {
  const fromEnv = process.env.UPLOADS_STORAGE_DIR?.trim();
  if (fromEnv) return fromEnv;
  const workspaceDefault = '/workspace/storage/uploads';
  if (process.platform !== 'win32' && existsSync('/workspace/storage')) {
    return workspaceDefault;
  }
  return join(process.cwd(), 'storage', 'uploads');
}

export function getCvsDir(): string {
  return join(getUploadsBaseDir(), 'cvs');
}

export function getLogosDir(): string {
  return join(getUploadsBaseDir(), 'logos');
}

export function ensureUploadsDirs(): { cvs: string; logos: string } {
  const cvs = getCvsDir();
  const logos = getLogosDir();
  mkdirSync(cvs, { recursive: true });
  mkdirSync(logos, { recursive: true });
  return { cvs, logos };
}
