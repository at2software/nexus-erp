import { Service, Type, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { nx } from '@models/_core/nx-bridge';
import { INxModal } from '@models/_core/nx.modal.interface';
import { ModalBaseComponent } from './modal-base.component';

type ModalResult<M> = M extends INxModal<infer R> ? R : never;

@Service()
export class ModalBaseService {
    #modalService = inject(NgbModal);

    public open<M extends INxModal<unknown>>(modalType: Type<M>, ...args: Parameters<M['init']>): Promise<ModalResult<M> | undefined> {
        const options = (modalType as unknown as typeof ModalBaseComponent).modalOptions;
        const modalRef = this.#modalService.open(modalType, options);
        (modalRef.componentInstance as M).init(...args);
        return modalRef.result.catch(() => undefined);
    }

    public static open<M extends INxModal<unknown>>(modalType: Type<M>, ...args: Parameters<M['init']>): Promise<ModalResult<M> | undefined> {
        return nx().getService(ModalBaseService).open(modalType, ...args);
    }
}