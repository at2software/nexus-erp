import { DestroyRef, Directive, ElementRef, NgZone, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Directive({
    selector: '[hotkey]',
})
export class HotkeyDirective implements OnInit {
    hotkey = input<string>();

    #el: ElementRef = inject(ElementRef);

    constructor() {
        const destroyRef = inject(DestroyRef);
        inject(NgZone).runOutsideAngular(() => {
            fromEvent<KeyboardEvent>(window, 'keydown')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe((event) => {
                    const hotkey = this.hotkey();
                    if (hotkey && HotkeyDirective.applies(event, hotkey)) {
                        this.#el.nativeElement.click();
                        event.preventDefault();
                        event.stopPropagation();
                    }
                });
        });
    }

    ngOnInit() {
        this.#el.nativeElement.ngbTooltip = this.hotkey();
    }

    static applies(event: KeyboardEvent, hotkey: string): boolean {
        const parts = hotkey.split('+');
        const key = parts[parts.length - 1].toUpperCase();
        const normalizedKey = key === 'SPACE' ? ' ' : key;
        return parts.includes('CTRL') === event.ctrlKey && parts.includes('ALT') === event.altKey && parts.includes('SHIFT') === event.shiftKey && normalizedKey === event.key.toUpperCase();
    }
}
