import { Component, EventEmitter, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TOptions } from '@dashboard/widgets/base.widget.component';
import { OptionType } from '@dashboard/widgets/widget-options/widget-options.component';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'paydown-modal', templateUrl: './modal-edit-widget-options.component.html', styleUrls: ['./modal-edit-widget-options.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class ModalEditWidgetOptionsComponent extends ModalBaseComponent<boolean> {

    #activeModal = inject(NgbActiveModal)

    options: TOptions
    onUpdate = new EventEmitter<any>()

    _onUpdate($event:any, key:string) {
        let v = $event.target.value
        if (this.options[key].type == OptionType.Number) v = parseFloat(v)
        if (this.options[key].type == OptionType.Boolean) v = $event.target.checked
        this.options[key].value = v
        this.onUpdate.emit(this.options)
    }    
    init(options:TOptions, onUpdate:EventEmitter<boolean>): void {
        this.options = options
        this.onUpdate = onUpdate
    }
    onSuccess = () => true

    getKeys = () => Object.keys(this.options)
    getValue = (key:string) => this.options[key]
    isNumber = (key:string) => this.options[key].type == OptionType.Number
    isString = (key:string) => this.options[key].type == OptionType.String
    isBoolean = (key:string) => this.options[key].type == OptionType.Boolean

    accept = () => this.#activeModal.close(true);
    decline = () => this.#activeModal.close(undefined);
    dismiss = () => this.#activeModal.close(undefined);
}