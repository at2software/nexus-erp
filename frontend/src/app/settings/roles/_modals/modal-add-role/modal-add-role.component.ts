import { ChangeDetectionStrategy, Component, inject, signal, Service } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'modal-add-role',
    templateUrl: './modal-add-role.component.html',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalAddRoleComponent {
    roleName = signal('');

    #activeModal = inject(NgbActiveModal);

    #saveRoleName = () => this.roleName().split(' ').join('_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

    decline = () => this.#activeModal.close(undefined);
    accept = () => this.#activeModal.close(this.#saveRoleName());
    dismiss = () => this.#activeModal.dismiss();
}

@Service()
export class ModalAddRoleService {
    #modalService = inject(NgbModal);

    open = (): Promise<string> => this.#modalService.open(ModalAddRoleComponent, { size: 'lg' }).result;
}
