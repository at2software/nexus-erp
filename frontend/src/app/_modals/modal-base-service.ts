import { Injectable, Type, inject } from "@angular/core";
import { NxGlobal } from "@app/nx/nx.global";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ModalBaseComponent } from "./modal-base.component";


@Injectable({ providedIn: "root" })
export class ModalBaseService<T> {

    protected modalService = inject(NgbModal)

    public open(modalType: Type<ModalBaseComponent<T>>, ...args:any): Promise<T> {
        const modalRef = this.modalService.open(modalType, { size: 'xl' });
        modalRef.componentInstance.init(...args)
        return modalRef.result
    }
    public static open = (modalType: Type<any>, ...args:any) => NxGlobal.getService(ModalBaseService).open(modalType, ...args)
}