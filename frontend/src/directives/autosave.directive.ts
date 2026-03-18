import { Directive, Input, OnInit, Output, EventEmitter, HostListener, OnDestroy } from '@angular/core';
import { Dictionary } from 'src/constants/constants';
import { Serializable } from 'src/models/serializable';

@Directive({
    selector: '[autosave]',
    standalone: true
})
export class AutosaveDirective implements OnInit, OnDestroy {

    @Input() autosave: Serializable
    @Input() autosaveKey?:string             // used for non-primitive fields
    @Input() ngModel: any
    @Output() ngModelChange = new EventEmitter<any>()
    @Output() saved = new EventEmitter<any>()

    value: any
    snapshot:Dictionary

    @HostListener('blur') onBlur = () => this.updateIfNecessary()
    @HostListener('window:beforeunload') onBeforeUnload = () => this.updateIfNecessary()

    ngOnDestroy = (): void => this.updateIfNecessary()
    ngOnInit(): void { 
        this.value = this.ngModel 
    }

    updateIfNecessary(): void {
        if (this.ngModel !== this.value) {
            this.value = this.ngModel
            let payload:any = undefined
            if (this.autosaveKey) {
                payload = {}
                payload[this.autosaveKey] = this.ngModel
            }
            if ('update' in this.autosave) {
                this.autosave.update(payload).subscribe((_) => {
                    this.saved.next(_)
                })
            }
        }
    }
}
