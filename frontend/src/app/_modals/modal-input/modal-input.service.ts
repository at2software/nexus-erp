import { Service, inject } from '@angular/core';
import { ModalBaseService } from '../modal-base-service';
import { ModalInputComponent } from './modal-input.component';
import { ModalInputResult } from '@models/_core/modal-results';

@Service()
export class InputModalService {
    #modal = inject(ModalBaseService);

    open(text: string, hasMore = false, infoMessage?: string, initialValue?: string): Promise<ModalInputResult | undefined> {
        return this.#modal.open(ModalInputComponent, { title: text, message: infoMessage, initialValue, hasMore });
    }
}
