import { ContentChild, Directive, ElementRef, HostListener, inject, AfterViewInit } from "@angular/core";
import { NxDropdown } from "./nx.dropdown";
import { AutopositionDirective, ECorrection } from "@directives/autoposition.directive";

@Directive({ selector: '.nx-menu', standalone: true })
export class NxSubMenu implements AfterViewInit {
    
    el = inject(ElementRef)

    @ContentChild(NxDropdown) submenu?: NxDropdown
    @ContentChild(AutopositionDirective) autoposition?: AutopositionDirective

    @HostListener('mouseenter') mouseenter() {
        this.submenu?.el.nativeElement.classList.add('show')
    }
    @HostListener('mouseleave') mouseleave() {
        this.submenu?.el.nativeElement.classList.remove('show')
    }

    ngAfterViewInit() {
        this.submenu?.el.nativeElement.classList.remove('show')
        this.autoposition?.corrected.subscribe(correction => {
            if (correction & ECorrection.Right) {
                this.submenu?.parent?.el.nativeElement.classList.add('dropstart')
            } else {
                this.submenu?.parent?.el.nativeElement.classList.remove('dropstart')
            }
        })
    }
}