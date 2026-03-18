import { Component, inject, Injectable } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'modal-add-role',
    templateUrl: './modal-add-role.component.html',
    styleUrls: ['./modal-add-role.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class ModalAddRoleComponent {


	roleName: string

	#activeModal: NgbActiveModal = inject(NgbActiveModal)

	#saveRoleName(): string{
		return this.roleName.split(" ").join("_").replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
	}

	decline = () => this.#activeModal.close(undefined);
	accept = () => this.#activeModal.close(this.#saveRoleName());
	dismiss = () => this.#activeModal.dismiss();

}

@Injectable({ providedIn: "root" })
export class ModalAddRoleService {

	constructor(private modalService: NgbModal) { }

	public open(): Promise<string> {
		const modalRef = this.modalService.open(ModalAddRoleComponent, { size: 'lg' });
		return modalRef.result;
	}
}
