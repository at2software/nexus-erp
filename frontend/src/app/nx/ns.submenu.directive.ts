import { DestroyRef, Directive, ElementRef, afterNextRender, contentChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { NxDropdown } from './nx.dropdown';
import { AutopositionDirective, ECorrection } from '@directives/autoposition.directive';

@Directive({ selector: '.nx-menu' })
export class NxSubMenu {
    el = inject(ElementRef);

    private readonly submenu = contentChild(NxDropdown);
    private readonly autoposition = contentChild(AutopositionDirective);

    constructor() {
        const destroyRef = inject(DestroyRef);
        fromEvent(this.el.nativeElement, 'mouseenter')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => this.submenu()?.el.nativeElement.classList.add('show'));
        fromEvent(this.el.nativeElement, 'mouseleave')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => this.submenu()?.el.nativeElement.classList.remove('show'));

        afterNextRender(() => {
            this.submenu()?.el.nativeElement.classList.remove('show');
            const subscription = this.autoposition()?.corrected.subscribe((correction) => {
                if (correction & ECorrection.Right) {
                    this.submenu()?.parent()?.el.nativeElement.classList.add('dropstart');
                } else {
                    this.submenu()?.parent()?.el.nativeElement.classList.remove('dropstart');
                }
            });
            destroyRef.onDestroy(() => subscription?.unsubscribe());
        });
    }
}
