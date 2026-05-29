import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'modal-add-role',
    templateUrl: './modal-add-role.component.html',
    styleUrls: ['./modal-add-role.component.scss'],
    standalone: true,
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

@Injectable({ providedIn: 'root' })
export class ModalAddRoleService {
    #modalService = inject(NgbModal);

    open = (): Promise<string> => this.#modalService.open(ModalAddRoleComponent, { size: 'lg' }).result;
}
