import { Injectable, Type, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NxGlobal } from '@app/nx/nx.global';
import { ModalBaseComponent } from './modal-base.component';

type ModalResult<M> = M extends ModalBaseComponent<infer R> ? R : never;

@Injectable({ providedIn: 'root' })
export class ModalBaseService {
    #modalService = inject(NgbModal);

    public open<M extends ModalBaseComponent<unknown>>(modalType: Type<M>, ...args: Parameters<M['init']>): Promise<ModalResult<M> | undefined> {
        const options = (modalType as unknown as typeof ModalBaseComponent).modalOptions;
        const modalRef = this.#modalService.open(modalType, options);
        (modalRef.componentInstance as M).init(...args);
        return modalRef.result.catch(() => undefined);
    }

    public static open<M extends ModalBaseComponent<unknown>>(modalType: Type<M>, ...args: Parameters<M['init']>): Promise<ModalResult<M> | undefined> {
        return NxGlobal.getService(ModalBaseService).open(modalType, ...args);
    }
}