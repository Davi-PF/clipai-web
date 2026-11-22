export class R2UploadError extends Error {
  public readonly status?: number;
  public readonly isAborted: boolean;

  constructor(message: string, options: { status?: number; isAborted?: boolean } = {}) {
    super(message);
    this.name = 'R2UploadError';
    this.status = options.status;
    this.isAborted = options.isAborted ?? false;
  }
}

export function uploadFileToPresignedUrl(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new R2UploadError('Envio cancelado pelo usuário.', { isAborted: true }));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.withCredentials = false;
    xhr.setRequestHeader('Content-Type', contentType);

    const handleAbortSignal = () => {
      xhr.abort();
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbortSignal);
    };

    if (signal) {
      signal.addEventListener('abort', handleAbortSignal, { once: true });
    }

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(
        new R2UploadError(`Falha ao enviar arquivo para o armazenamento (status ${xhr.status}).`, {
          status: xhr.status,
        }),
      );
    };

    xhr.onerror = () => {
      cleanup();
      reject(
        new R2UploadError(
          'Erro de rede ou CORS durante o envio direto para o armazenamento de mídia.',
        ),
      );
    };

    xhr.onabort = () => {
      cleanup();
      reject(new R2UploadError('Envio cancelado pelo usuário.', { isAborted: true }));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new R2UploadError('Tempo esgotado durante o envio do arquivo. Tente novamente.'));
    };

    xhr.send(file);
  });
}
