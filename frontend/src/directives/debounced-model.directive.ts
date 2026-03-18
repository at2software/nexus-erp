import { Directive, ElementRef, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
    selector: '[debouncedModel]',
    standalone: true
})
export class DebouncedModelDirective implements OnInit, OnDestroy {
    @Input() debouncedModel: any;
    @Input() debounceTime: number = 300;
    @Output() debouncedModelChange = new EventEmitter<string>();

    #debounceTimer?: number
    #elementRef: ElementRef = inject(ElementRef)

    ngOnDestroy() {
        if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
        }
    }

    ngOnInit() {
        // Set initial value
        if (this.debouncedModel !== undefined) {
            this.#elementRef.nativeElement.value = this.debouncedModel || '';
        }
    }

    @HostListener('input', ['$event'])
    onInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const value = target.value;

        // Clear existing timer
        if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
        }

        // Set new debounced timer
        this.#debounceTimer = window.setTimeout(() => {
            this.debouncedModelChange.emit(value);
        }, this.debounceTime);
    }

    @HostListener('blur', ['$event'])
    onBlur(event: Event) {
        // Immediately emit on blur to ensure value is saved
        if (this.#debounceTimer) {
            clearTimeout(this.#debounceTimer);
        }
        const target = event.target as HTMLInputElement;
        this.debouncedModelChange.emit(target.value);
    }
}