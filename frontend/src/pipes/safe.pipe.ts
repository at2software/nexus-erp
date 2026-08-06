import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { sanitizeHtml } from '@constants/html/sanitize-html';

@Pipe({
    name: 'safe',
})
export class SafePipe implements PipeTransform {
    #sanitizer = inject(DomSanitizer);

    transform(value: string | null | undefined, type: string = 'url'): SafeHtml | SafeResourceUrl | string | null {
        const raw = value ?? '';
        switch (type) {
            case 'html':
                return this.#sanitizer.bypassSecurityTrustHtml(sanitizeHtml(raw));
            case 'url':
                return this.#sanitizer.bypassSecurityTrustResourceUrl(raw);
            default:
                return this.#sanitizer.bypassSecurityTrustResourceUrl(raw);
        }
    }
}
