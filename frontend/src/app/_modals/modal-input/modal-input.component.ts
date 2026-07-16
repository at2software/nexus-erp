import { ChangeDetectionStrategy, Component, ElementRef, Injectable, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NgbActiveModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { ModalBaseComponent } from '../modal-base.component';
import { ModalBaseService } from '../modal-base-service';

export interface ModalInputArgs {
    title: string;
    message?: string;
    initialValue?: string;
    hasMore?: boolean;
}
export interface ModalInputResult {
    text: string;
    more: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-input',
    templateUrl: './modal-input.component.html',
    imports: [FormsModule, HotkeyDirective, SafePipe],
})
export class ModalInputComponent extends ModalBaseComponent<ModalInputResult> {
    static override modalOptions: NgbModalOptions = { size: 'lg' };

    readonly inputField = viewChild.required<ElementRef>('inputField');

    modalTitle = '';
    result = '';
    hasMore = signal(false);
    infoMessage?: string;

    #activeModal = inject(NgbActiveModal);

    constructor() {
        super();
        afterNextRender(() => this.inputField().nativeElement.focus());
    }

    init(args: ModalInputArgs): void {
        this.modalTitle = args.title;
        this.infoMessage = args.message;
        if (args.hasMore !== undefined) this.hasMore.set(args.hasMore);
        if (args.initialValue !== undefined) this.result = args.initialValue;
    }
    onSuccess(): ModalInputResult {
        return { text: this.result, more: false };
    }
    // `accept` (ok) and `decline`/`dismiss` (cancel -> undefined) come from the base.
    more = () => this.#activeModal.close({ text: this.result, more: true });
}

@Injectable({ providedIn: 'root' })
export class InputModalService {
    #modal = inject(ModalBaseService);

    open(text: string, hasMore = false, infoMessage?: string, initialValue?: string): Promise<ModalInputResult | undefined> {
        return this.#modal.open(ModalInputComponent, { title: text, message: infoMessage, initialValue, hasMore });
    }
}
