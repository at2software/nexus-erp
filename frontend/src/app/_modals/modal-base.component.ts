import { inject } from '@angular/core';
import { NgbActiveModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

export abstract class ModalBaseComponent<T> {
    static modalOptions: NgbModalOptions = { size: 'xl' };
    // Each modal defines its own concrete init() signature; this base only needs the looser shape.
    abstract init(...args: unknown[]): void;
    abstract onSuccess(): T;

    #activeModal = inject(NgbActiveModal);

    accept = () => this.#activeModal.close(this.onSuccess());
    decline = () => this.#activeModal.close(undefined);
    dismiss = () => this.#activeModal.close(undefined);
}
