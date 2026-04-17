import { ModalConfirmComponent } from './modal-confirm.component';
import { Injectable, Type } from '@angular/core';
import { ModalBaseService } from '@app/_modals/modal-base-service';

export interface ConfirmationArguments {
	title: string,
	message: string,
	btnOkText?: string
	btnCancelText?: string
	dialogSize?: 'sm' | 'lg'

}
@Injectable({ providedIn: "root" })
export class ConfirmationService extends ModalBaseService<boolean> {

    public open(modalType: Type<any>, ...args: any): Promise<any> {
        return this.confirm(args[0])
    }
	public confirm(args:ConfirmationArguments): Promise<boolean> {
		if (!args.btnOkText) args.btnOkText = $localize`:@@i18n.common.ok:ok`
		if (!args.btnCancelText) args.btnCancelText = $localize`:@@i18n.common.cancel:cancel`
		if (!args.dialogSize) args.dialogSize = 'lg'
		const modalRef = this.modalService.open(ModalConfirmComponent, { size: args.dialogSize });
		modalRef.componentInstance.init(args);
		return new Promise<boolean>((resolve, reject) => {
            modalRef.result.then(_ => {
                if (_ === true) {
                    resolve(true)
                } else {
                    reject(false)
                }
            }).catch(() => reject(false))
        })
	}
}