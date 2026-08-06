import { DestroyRef, Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { Param } from '@models/param/param.model';
import { ParamService } from '@models/param/param.service';

@Directive({
    selector: '[paramPath]',
})
export class ParamDirective implements OnInit {
    readonly paramPath = input.required<string>();
    readonly fallback = input<boolean>(true);
    readonly autosave = input<boolean>();

    value: string = '';

    readonly #paramService = inject(ParamService);
    readonly #el = inject(ElementRef<HTMLInputElement>);

    constructor() {
        const destroyRef = inject(DestroyRef);
        fromEvent(this.#el.nativeElement, 'blur')
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => {
                const val = this.#el.nativeElement.value;
                this.#setValue(val);
                Param.write(this.paramPath(), val).subscribe();
            });
    }

    ngOnInit() {
        this.#paramService.show(this.paramPath(), { fallback: this.fallback() }).subscribe((p: Param) => p && typeof p.value === 'string' && this.#setValue(p.value));
    }

    #setValue(val: string) {
        this.value = val;
        this.#el.nativeElement.value = val;
    }
}
