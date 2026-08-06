import { Directive, input } from '@angular/core';

@Directive({
    selector: '[compact]',
    host: {
        '[class.compact]': 'compact()',
    },
})
export class CompactItemDirective {
    compact = input<boolean>(false);
}
