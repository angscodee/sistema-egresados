import { useState } from 'react';

type UploadOptions = {
  url: string;
  fieldName?: string;
  maxSizeMb?: number;
  accept?: string[];
};

type UploadState = {
  uploading: boolean;
  error: string | null;
};

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useFileUpload({ url, fieldName = 'file', maxSizeMb = 5, accept }: UploadOptions) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null });

  async function upload(file: File): Promise<{ url: string } | null> {
    if (accept && !accept.includes(file.type)) {
      setState({ uploading: false, error: `Tipo de archivo no permitido. Acepta: ${accept.join(', ')}` });
      return null;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setState({ uploading: false, error: `El archivo supera el límite de ${maxSizeMb} MB.` });
      return null;
    }

    setState({ uploading: true, error: null });

    const token = getAuthToken();
    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Error ${res.status}`);
      }

      const data = (await res.json()) as { cvUrl?: string; logoUrl?: string };
      const resultUrl = data.cvUrl ?? data.logoUrl ?? '';
      setState({ uploading: false, error: null });
      return { url: resultUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir el archivo.';
      setState({ uploading: false, error: msg });
      return null;
    }
  }

  function clearError() {
    setState((s) => ({ ...s, error: null }));
  }

  return { ...state, upload, clearError };
}
