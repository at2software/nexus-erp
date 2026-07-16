import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safe',
})
export class SafePipe implements PipeTransform {
    #sanitizer = inject(DomSanitizer);

    transform(value: any, type: string = 'url'): any {
        switch (type) {
            case 'html':
                return this.#sanitizer.sanitize(SecurityContext.HTML, value);
            case 'url':
                return this.#sanitizer.bypassSecurityTrustResourceUrl(value);
            default:
                return this.#sanitizer.bypassSecurityTrustResourceUrl(value);
        }
    }
}
