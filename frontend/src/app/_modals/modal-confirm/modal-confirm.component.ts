import { Component, model } from '@angular/core';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { ConfirmationArguments } from './confirmation.service';

@Component({
    selector: 'app-modal-confirm',
    templateUrl: './modal-confirm.component.html',
    styleUrls: ['./modal-confirm.component.scss'],
    standalone: true
})
export class ModalConfirmComponent extends ModalBaseComponent<boolean> {
    
    title         = model<string>('');
    message       = model<string>('');
    btnOkText     = model<string>($localize`:@@i18n.common.ok:ok`);
    btnCancelText = model<string>($localize`:@@i18n.common.cancel:cancel`);

    init(args: ConfirmationArguments): void {
        this.title.set(args.title);
        this.message.set(args.message);
        if (args.btnOkText) this.btnOkText.set(args.btnOkText);
        if (args.btnCancelText) this.btnCancelText.set(args.btnCancelText);
    }
    onSuccess() {
        return true
    }


}
