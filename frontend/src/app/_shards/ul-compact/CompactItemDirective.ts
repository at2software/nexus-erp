import { Directive, input } from '@angular/core';

@Directive({
  selector: '[compact]',
  standalone: true,
  host: {
    '[class.compact]': 'compact()',
  },
})
export class CompactItemDirective {
  compact = input<boolean>(false);
}