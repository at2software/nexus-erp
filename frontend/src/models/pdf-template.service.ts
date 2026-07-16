import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from './http/http.nexus';

export interface PdfTemplate {
    html: string;
    css: string;
    baseUrl: string;
    pdfBase: string;
    logoUrl: string;
    hasOriginal: boolean;
}

/** Read/write client for the shared PDF letterhead template (admin only). */
@Injectable({ providedIn: 'root' })
export class PdfTemplateService extends NexusHttpService<never> {
    apiPath = 'pdf-template';

    load = (): Observable<PdfTemplate> => this.get('pdf-template', {}, Object);
    save = (html: string, css: string) => this.put('pdf-template', { html, css }, Object);
    revert = (): Observable<PdfTemplate> => this.post('pdf-template/revert', {}, Object);
    renderPdf = (html: string, css: string): Observable<{ pdf: string }> => this.post('pdf-template/preview', { html, css }, Object);
    uploadLogo = (logo: File) => {
        const data = new FormData();
        data.append('logo', logo);
        return this.upload<{ success: boolean; logoUrl: string }>('pdf-template/logo', data);
    };
}
