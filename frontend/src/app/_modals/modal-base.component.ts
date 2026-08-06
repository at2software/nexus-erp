import { inject } from '@angular/core';
import { NgbActiveModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { INxModal } from '@models/_core/nx.modal.interface';

export abstract class ModalBaseComponent<T> implements INxModal<T> {
    static modalOptions: NgbModalOptions = { size: 'xl' };
    abstract init(...args: unknown[]): void;
    abstract onSuccess(): T;

    #activeModal = inject(NgbActiveModal);

    accept = () => this.#activeModal.close(this.onSuccess());
    decline = () => this.#activeModal.close(undefined);
    dismiss = () => this.#activeModal.close(undefined);
}
