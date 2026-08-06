import { DestroyRef, Directive, ElementRef, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { Serializable } from '@models/_core/serializable';

@Directive({
    selector: '[autosave]',
})
export class AutosaveDirective implements OnInit, OnDestroy {
    readonly autosave = input.required<Serializable>();
    readonly autosaveKey = input<string>();
    readonly ngModel = input<unknown>();
    readonly ngModelChange = output<unknown>();
    readonly saved = output<Serializable>();

    #lastValue: unknown;

    constructor() {
        const el = inject(ElementRef);
        const destroyRef = inject(DestroyRef);
        fromEvent(el.nativeElement, 'input')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => {
                const key = this.autosaveKey();
                if (!key || (el.nativeElement as HTMLInputElement).type !== 'number') return;
                const inputEl = el.nativeElement as HTMLInputElement;
                (this.autosave() as unknown as Record<string, unknown>)[key] = inputEl.value === '' ? null : parseFloat(inputEl.value);
            });
        fromEvent(el.nativeElement, 'blur')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => {
                const key = this.autosaveKey();
                const current = key ? this.#fieldValue(key) : this.ngModel();
                if (current === this.#lastValue) return;
                this.#updateIfNecessary();
            });
        fromEvent(window, 'beforeunload')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => this.#updateIfNecessary());
    }

    ngOnInit(): void {
        const key = this.autosaveKey();
        this.#lastValue = key ? this.#fieldValue(key) : this.ngModel();
    }

    ngOnDestroy(): void {
        this.#updateIfNecessary();
    }

    #fieldValue = (key: string): unknown => (this.autosave() as unknown as Record<string, unknown>)[key];

    #updateIfNecessary(): void {
        const key = this.autosaveKey();
        const current = key ? this.#fieldValue(key) : this.ngModel();
        if (current === this.#lastValue) return;

        this.#lastValue = current;
        const payload = key ? { [key]: current } : undefined;

        if ('update' in this.autosave()) {
            this.autosave()
                .update(payload)
                .subscribe((result) => this.saved.emit(result));
        }
    }
}
