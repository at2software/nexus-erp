import { Directive, ElementRef, HostListener, afterNextRender, contentChild, inject } from '@angular/core';
import { NxDropdown } from './nx.dropdown';
import { AutopositionDirective, ECorrection } from '@directives/autoposition.directive';

@Directive({ selector: '.nx-menu', standalone: true })
export class NxSubMenu {
    el = inject(ElementRef);

    private readonly submenu = contentChild(NxDropdown);
    private readonly autoposition = contentChild(AutopositionDirective);

    constructor() {
        afterNextRender(() => {
            this.submenu()?.el.nativeElement.classList.remove('show');
            this.autoposition()?.corrected.subscribe((correction) => {
                if (correction & ECorrection.Right) {
                    this.submenu()?.parent()?.el.nativeElement.classList.add('dropstart');
                } else {
                    this.submenu()?.parent()?.el.nativeElement.classList.remove('dropstart');
                }
            });
        });
    }

    @HostListener('mouseenter') mouseenter() {
        this.submenu()?.el.nativeElement.classList.add('show');
    }
    @HostListener('mouseleave') mouseleave() {
        this.submenu()?.el.nativeElement.classList.remove('show');
    }
}
