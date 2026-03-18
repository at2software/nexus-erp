import { inject } from "@angular/core"
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap"

export abstract class ModalBaseComponent<T> {
    abstract init(...args:any):void
    abstract onSuccess():T
    #activeModal = inject(NgbActiveModal)
    decline    = () => this.#activeModal.dismiss()
    accept     = () => this.#activeModal.close(this.onSuccess())
    dismiss    = () => this.#activeModal.dismiss()
}