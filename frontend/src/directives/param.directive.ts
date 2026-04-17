import { Directive, ElementRef, HostListener, inject, input, OnInit } from "@angular/core";
import { Param } from "src/models/param.model";
import { ParamService } from "src/models/param.service";

@Directive({
    selector: '[paramPath]',
    standalone: true
})
export class ParamDirective implements OnInit {

    readonly paramPath = input.required<string>()
    readonly fallback  = input<boolean>(true)
    readonly autosave  = input<boolean>()

    value: string

    readonly #paramService = inject(ParamService)
    readonly #el = inject(ElementRef<HTMLInputElement>)

    ngOnInit() {
        this.#paramService.show(this.paramPath(), { fallback: this.fallback() })
            .subscribe((p: Param) => p && typeof p.value === 'string' && this.#setValue(p.value))
    }

    @HostListener('blur') onBlur() {
        const val = this.#el.nativeElement.value
        this.#setValue(val)
        this.#paramService.update(this.paramPath(), { value: val }).subscribe()
    }

    #setValue(val: string) {
        this.value = val
        this.#el.nativeElement.value = val
    }
}
