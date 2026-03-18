import { Directive, ElementRef, HostListener, inject, Input, OnInit } from "@angular/core";

@Directive({
    selector: '[hotkey]',
    standalone: true
})
export class HotkeyDirective implements OnInit {

	@Input() hotkey: string
	#el: ElementRef = inject(ElementRef)

	ngOnInit() {
		this.#el.nativeElement.ngbTooltip = this.hotkey
	}

	@HostListener('window:keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
		if (HotkeyDirective.applies(event, this.hotkey)) {
			this.#el.nativeElement.click()
			event.preventDefault()
			event.stopPropagation()
		}
	}

	static applies(event: KeyboardEvent, hotkey: string): boolean {
		const parts = hotkey.split('+')
		const key = parts[parts.length - 1].toUpperCase()
		const normalizedKey = key === 'SPACE' ? ' ' : key

		return 	parts.includes('CTRL') === event.ctrlKey &&
				parts.includes('ALT') === event.altKey &&
				parts.includes('SHIFT') === event.shiftKey &&
				normalizedKey === event.key.toUpperCase()
	}
}