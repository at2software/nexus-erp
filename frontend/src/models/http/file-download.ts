import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Toast } from '@shards/toast/toast';

/** Extracts the most specific human-readable message from an HTTP error payload. */
export const httpErrorMessage = (err: HttpErrorResponse): string | undefined =>
    err.error?.message ?? err.error?.error_description ?? err.statusText;

/** Logs and toasts display-worthy (>= 400) HTTP errors; ignores everything else. */
export function notifyHttpError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status >= 400) {
        console.warn('[HTTP]', err.status, err.url ?? '', err.error ?? err.statusText);
        const message = httpErrorMessage(err);
        if (message) Toast.error(message);
    }
}

/** Triggers a browser download for a blob response, honoring Content-Disposition. */
export function saveBlobResponse(res: HttpResponse<Blob>, success?: () => void): void {
    const contentType = res.headers.get('Content-Type')?.split(';')[0] ?? 'application/pdf';
    const fileName = res.headers.get('Content-Disposition')?.match(/['"](.*?)['"]/);
    const blob = new Blob([res.body!], { type: contentType });
    const a = document.createElement('a');
    const objectUrl = window.URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.href = objectUrl;
    a.download = fileName ? fileName[1] : 'download.pdf';
    a.click();
    setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(a);
        success?.();
    });
}
