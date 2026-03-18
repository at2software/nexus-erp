import { Component, Input } from '@angular/core';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'app-modal-confirm',
    templateUrl: './modal-confirm.component.html',
    styleUrls: ['./modal-confirm.component.scss'],
    standalone: true
})
export class ModalConfirmComponent extends ModalBaseComponent<boolean> {
    init(args: any): void {
        this.title = args.title
        this.message = args.message
    }
    onSuccess() {
        return true
    }

    @Input() title: string;
    @Input() message: string;
    @Input() btnOkText: string = $localize`:@@i18n.common.ok:ok`;
    @Input() btnCancelText: string = $localize`:@@i18n.common.cancel:cancel`;

}
