import { Component, inject, Injectable } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotkeyDirective } from '@directives/hotkey.directive';

export interface NewUserData {
    name: string
    email: string
    password: string
}

@Component({
    selector: 'modal-new-user',
    templateUrl: './modal-new-user.component.html',
    standalone: true,
    imports: [FormsModule, HotkeyDirective]
})
export class ModalNewUserComponent {
    name     = ''
    email    = ''
    password = ''
    error    = ''

    #activeModal = inject(NgbActiveModal)

    get canSubmit() { return !!this.name.trim() && !!this.email.trim() && this.password.length >= 8 }

    decline = () => this.#activeModal.close(undefined)
    accept  = () => { if (this.canSubmit) this.#activeModal.close({ name: this.name.trim(), email: this.email.trim(), password: this.password }) }
}

@Injectable({ providedIn: 'root' })
export class ModalNewUserService {
    #modalService = inject(NgbModal)

    open(): Promise<NewUserData | undefined> {
        return this.#modalService.open(ModalNewUserComponent, { size: 'md' }).result
    }
}
