import { Directive, input, output, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Serializable } from 'src/models/serializable';

@Directive({
    selector: '[autosave]',
    standalone: true
})
export class AutosaveDirective implements OnInit, OnDestroy {

    readonly autosave      = input.required<Serializable>()
    readonly autosaveKey   = input<string>()
    readonly ngModel       = input<any>()
    readonly ngModelChange = output<any>()
    readonly saved         = output<any>()

    #lastValue: any

    ngOnInit(): void {
        this.#lastValue = this.ngModel()
    }

    ngOnDestroy(): void {
        this.#updateIfNecessary()
    }

    @HostListener('blur')
    onBlur(): void { this.#updateIfNecessary() }

    @HostListener('window:beforeunload')
    onBeforeUnload(): void { this.#updateIfNecessary() }

    #updateIfNecessary(): void {
        const current = this.ngModel()
        if (current === this.#lastValue) return

        this.#lastValue = current
        const key = this.autosaveKey()
        const payload = key ? { [key]: current } : undefined

        if ('update' in this.autosave()) {
            this.autosave().update(payload).subscribe(result => this.saved.emit(result))
        }
    }
}
