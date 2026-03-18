import { ElementRef, Injectable } from "@angular/core";
import { HeaderComponent } from "../header/header.component";

@Injectable({ providedIn: 'root' })
export class ToolbarService {
    deferred:ElementRef[] = []
    component:HeaderComponent|undefined = undefined
    add = (headerSegment:ElementRef) => {
        if (!this.component) {
            this.deferred.unshift(headerSegment)
        } else {
            this.component.prepend(headerSegment)
        }
    }
    unregister = () => { this.component = undefined}
    register = (container:HeaderComponent) => {
        this.component = container
        for (const c of this.deferred) {
            this.add(c)
        }
        this.deferred = []
    }
}