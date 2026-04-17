import { Component, contentChild, ElementRef, inject, model, OnDestroy, Type, OnInit, input } from '@angular/core';
import { ActivityService } from './activity.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
    selector: 'activity-tab',
    template: '<ng-content></ng-content>',
    host: { class: 'tab-pane fade' },
    standalone: true
})
export class ActivityTabComponent implements OnDestroy, OnInit {

    icon = input<string>()
    nicon = input<string>()
    hidden = model<boolean>(false)
    badge = model<string|undefined>(undefined)
    componentType = input<Type<any>>()

    scroll = contentChild(ScrollbarComponent);

    index: number = 0
    id: number = 0

    el = inject(ElementRef)
    #srv = inject(ActivityService)

    ngOnInit(): void { 
        this.id = this.#srv.getCurrentUniqueId()
        this.#srv.addTab(this) 
    }
    ngOnDestroy(): void { 
        this.#srv.removeTab(this) 
    }
    prepare(id:number) {
        this.el.nativeElement.setAttribute('id', 'activity-' + id)
        this.el.nativeElement.setAttribute('name', 'activity-' + id)
        this.el.nativeElement.setAttribute('aria-labelledby', 'activity-tab-' + id)
        this.el.nativeElement.setAttribute('role', 'tabpanel')
    }
    onFocus: () => void = () => { /* noop */ }
    onBlur:  () => void = () => { /* noop */ }

    show = () => this.hidden.set(false)
    hide = () => this.hidden.set(true)
    focus = () => this.#srv.focus(this)
}