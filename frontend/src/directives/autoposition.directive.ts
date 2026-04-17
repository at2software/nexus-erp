import { Directive, ElementRef, EventEmitter, Output, Renderer2, AfterViewInit } from "@angular/core"

const OFFSET = {
    top   : 10,
    left  : 10,
    right : 10,
    bottom: 10
}
export enum ECorrection {
    Top    = 1<<0,
    Right  = 1<<1,
    Bottom = 1<<2,
    Left   = 1<<3,
}

@Directive({
    selector: '.autoposition',
    standalone: true
})
export class AutopositionDirective implements AfterViewInit {    
    
    @Output() corrected = new EventEmitter<ECorrection>()

    constructor(private el: ElementRef, private re:Renderer2) {}

    static calculateResposition(el:ElementRef):[any, ECorrection] {
        const element = el.nativeElement
        const orig = element.getBoundingClientRect()
        const rect:any = JSON.parse(JSON.stringify(orig))
        let correction = 0
        let maxHeight: number | null = null

        if (element.classList.contains('autoposition-relative')) {
            const parent = element.closest('.nx-menu')
            if (parent) {
                const parentRect = parent.getBoundingClientRect()
                const parentDropdown = parent.closest('.dropdown-menu')
                const parentDropdownRect = parentDropdown?.getBoundingClientRect()

                let targetLeft = parentDropdownRect ? parentDropdownRect.width - 5 : parentRect.width - 5
                let targetTop = parentRect.top - 5

                // Check right edge overflow
                if (parentRect.right - 5 + rect.width + OFFSET.right > window.innerWidth) {
                    targetLeft = 5
                    correction |= ECorrection.Right
                }

                // Calculate available height
                const availableHeight = window.innerHeight - OFFSET.top - OFFSET.bottom

                // If content doesn't fit, constrain height and enable scrolling
                if (rect.height > availableHeight) {
                    maxHeight = availableHeight
                    targetTop = OFFSET.top
                    correction |= ECorrection.Top | ECorrection.Bottom
                } else {
                    // Check bottom edge overflow
                    if (targetTop + rect.height + OFFSET.bottom > window.innerHeight) {
                        targetTop = window.innerHeight - (rect.height + OFFSET.bottom)
                        correction |= ECorrection.Bottom
                    }

                    // Check top edge overflow
                    if (targetTop < OFFSET.top) {
                        targetTop = OFFSET.top
                        correction |= ECorrection.Top
                    }
                }
                return [{ top: targetTop - orig.top, left: targetLeft, maxHeight }, correction]
            }
        } else {
            // Calculate available height
            const availableHeight = window.innerHeight - OFFSET.top - OFFSET.bottom

            // If content doesn't fit, constrain height and enable scrolling
            if (rect.height > availableHeight) {
                maxHeight = availableHeight
                rect.top = OFFSET.top
                correction |= ECorrection.Top | ECorrection.Bottom
            } else {
                if (window.innerHeight < rect.top + rect.height + OFFSET.bottom) {
                    rect.top = window.innerHeight - (rect.height + OFFSET.bottom)
                    correction |= ECorrection.Bottom
                }
                if (rect.top < OFFSET.top) {
                    rect.top = OFFSET.top
                    correction |= ECorrection.Top
                }
            }
            if (window.innerWidth < rect.left + rect.width + OFFSET.right) {
                rect.left = window.innerWidth - (rect.width + OFFSET.right)
                correction |= ECorrection.Right
            }
            if (rect.left < OFFSET.left) {
                rect.left = OFFSET.left
                correction |= ECorrection.Left
            }
            rect.maxHeight = maxHeight
        }
        return [rect, correction]
    }
    static reposition(el:ElementRef, re:Renderer2, emitter?:EventEmitter<ECorrection>):ECorrection {
        const [rect, correction] = this.calculateResposition(el)
        re.setStyle(el.nativeElement, 'top', rect.top + 'px')
        re.setStyle(el.nativeElement, 'left', rect.left + 'px')
        if (rect.maxHeight !== null) {
            re.setStyle(el.nativeElement, 'max-height', rect.maxHeight + 'px')
            re.setStyle(el.nativeElement, 'overflow-y', 'auto')
        } else {
            re.removeStyle(el.nativeElement, 'max-height')
            re.removeStyle(el.nativeElement, 'overflow-y')
        }
        emitter?.next(correction)
        return correction
    }
    ngAfterViewInit() {
        new MutationObserver(() => {
            const target = this.el.nativeElement
            if (target.classList.contains('show')) {
                AutopositionDirective.reposition(this.el, this.re, this.corrected)
            } else {
                target.style.top = '0'
                target.style.left = '0'
            }
        }).observe(this.el.nativeElement, { attributeFilter: ['class'], attributes: true })
    }
}