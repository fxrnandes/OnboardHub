import { ApiError, tokenStorage } from './client';

export type MediaKind = 'image' | 'video';

export interface StepMedia {
  id: string;
  kind: MediaKind;
  contentType: string;
  name: string;
  size: number;
  url: string;
}

const MB = 1024 * 1024;

export const mediaRules: Record<MediaKind, { types: string[]; accept: string; maxBytes: number; label: string }> = {
  image: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    maxBytes: 10 * MB,
    label: 'JPG, PNG, WEBP ou GIF, até 10 MB',
  },
  video: {
    types: ['video/mp4', 'video/webm', 'video/quicktime'],
    accept: 'video/mp4,video/webm,video/quicktime',
    maxBytes: 200 * MB,
    label: 'MP4, WEBM ou MOV, até 200 MB',
  },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0).replace('.', ',')} MB`;
}

export function checkFile(file: File, kind: MediaKind): string | null {
  const rule = mediaRules[kind];
  if (!rule.types.includes(file.type)) {
    return kind === 'image' ? 'Escolha uma imagem JPG, PNG, WEBP ou GIF.' : 'Escolha um vídeo MP4, WEBM ou MOV.';
  }
  if (file.size > rule.maxBytes) {
    return `O arquivo tem ${formatBytes(file.size)}. O limite é ${formatBytes(rule.maxBytes)}.`;
  }
  return null;
}

export function uploadMedia(file: File, onProgress?: (percent: number) => void): { promise: Promise<StepMedia>; cancel: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<StepMedia>((resolve, reject) => {
    xhr.open('POST', '/api/media');
    const token = tokenStorage.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const data = xhr.response as { media?: StepMedia; error?: { code?: string; message?: string } } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data?.media) resolve(data.media);
      else
        reject(
          new ApiError(
            xhr.status,
            data?.error?.code ?? 'upload_failed',
            data?.error?.message ?? 'Não foi possível enviar o arquivo. Tente novamente.',
          ),
        );
    };
    xhr.onerror = () => reject(new ApiError(0, 'network_error', 'Não foi possível conectar ao servidor.'));
    xhr.onabort = () => reject(new ApiError(0, 'upload_canceled', 'Envio cancelado.'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
  return { promise, cancel: () => xhr.abort() };
}
