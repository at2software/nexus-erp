import { EventEmitter, Injectable, Output } from "@angular/core"

@Injectable({providedIn: 'root'})
export class BaseWidgetListener {
    @Output() updated = new EventEmitter<[any, number, number]>()
    @Output() deleted = new EventEmitter<[any, number, number]>()
}