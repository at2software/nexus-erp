import { DestroyRef, Directive, ElementRef, NgZone, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { Serializable } from '@models/serializable';
import { Toast } from '@shards/toast/toast';

@Directive({
    selector: '[autosave]',
})
export class AutosaveDirective implements OnInit, OnDestroy {
    readonly autosave = input.required<Serializable>();
    readonly autosaveKey = input<string>();
    readonly ngModel = input<any>();
    readonly ngModelChange = output<any>();
    readonly saved = output<any>();

    #lastValue: any;

    constructor() {
        const el = inject(ElementRef);
        const destroyRef = inject(DestroyRef);
        const ngZone = inject(NgZone);
        ngZone.runOutsideAngular(() => {
            // Tracks value for number inputs without [(ngModel)] — avoids NgModel's inside-zone blur listener.
            fromEvent(el.nativeElement, 'input')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => {
                    const key = this.autosaveKey();
                    if (!key || (el.nativeElement as HTMLInputElement).type !== 'number') return;
                    const inputEl = el.nativeElement as HTMLInputElement;
                    (this.autosave() as any)[key] = inputEl.value === '' ? null : parseFloat(inputEl.value);
                });
            fromEvent(el.nativeElement, 'blur')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => {
                    const key = this.autosaveKey();
                    const current = key ? (this.autosave() as any)[key] : this.ngModel();
                    if (current === this.#lastValue) return;
                    ngZone.run(() => this.#updateIfNecessary());
                });
            fromEvent(window, 'beforeunload')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => this.#updateIfNecessary());
        });
    }

    ngOnInit(): void {
        const key = this.autosaveKey();
        this.#lastValue = key ? (this.autosave() as any)[key] : this.ngModel();
    }

    ngOnDestroy(): void {
        this.#updateIfNecessary();
    }

    #updateIfNecessary(): void {
        const key = this.autosaveKey();
        const current = key ? (this.autosave() as any)[key] : this.ngModel();
        if (current === this.#lastValue) return;

        this.#lastValue = current;
        const payload = key ? { [key]: current } : undefined;

        if ('update' in this.autosave()) {
            this.autosave()
                .update(payload)
                .subscribe((result) => {
                    this.saved.emit(result);
                    Toast.show("saved");
                });
        }
    }
}
