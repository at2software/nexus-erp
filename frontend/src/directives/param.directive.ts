import { Directive, ElementRef, HostListener, Input, inject, OnInit } from "@angular/core";
import { Param } from "src/models/param.model";
import { ParamService } from "src/models/param.service";

@Directive({
    selector: '[paramPath]',
    standalone: true
})
export class ParamDirective implements OnInit {

    @Input() paramPath:string
    @Input() fallback:boolean = true
    @Input() autosave:boolean
    value:string

    #paramService = inject(ParamService)
    #element = inject(ElementRef)

    @HostListener('blur') onChange = () => {
        this.#updateModelString(this.#element.nativeElement.value)
        this.#paramService.update(this.paramPath, { value: this.#element.nativeElement.value}).subscribe()
    }

    ngOnInit() { this.#refresh() }

    #updateModelString = (_:string) =>  { 
        this.value = _
        this.#element.nativeElement.value = _ 
    }
    #updateModel = (_:Param) => _ && this.#updateModelString(_.value ?? '')
	#refresh = () => this.#paramService.show(this.paramPath, { fallback: this.fallback }).subscribe(this.#updateModel)
}