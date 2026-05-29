import { ChangeDetectionStrategy, Component, ElementRef, Injectable, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { ModalBaseComponent } from '../modal-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-input',
    templateUrl: './modal-input.component.html',
    styleUrls: ['./modal-input.component.scss'],
    standalone: true,
    imports: [FormsModule, HotkeyDirective, SafePipe],
})
export class ModalInputComponent extends ModalBaseComponent<string> {
    readonly inputField = viewChild.required<ElementRef>('inputField');

    modalTitle: string = '';
    result: string = '';
    hasMore = signal(false);
    infoMessage?: string;

    activeModal: NgbActiveModal = inject(NgbActiveModal);

    constructor() {
        super();
        afterNextRender(() => this.inputField().nativeElement.focus());
    }

    init(args: any): void {
        this.modalTitle = args.title;
        this.infoMessage = args.message;
        if (args.initialValue !== undefined) this.result = args.initialValue;
    }
    onSuccess() {
        return this.result;
    }
    decline = () => this.activeModal.close(undefined);
    accept = () => this.activeModal.close({ text: this.result, more: false });
    more = () => this.activeModal.close({ text: this.result, more: true });
    dismiss = () => this.activeModal.dismiss();
}

@Injectable({ providedIn: 'root' })
export class InputModalService {
    modalService = inject(NgbModal);

    open(text: string, hasMore: boolean = false, infoMessage?: string, initialValue?: string): Promise<{ text: string; more: boolean } | undefined> {
        const modalRef = this.modalService.open(ModalInputComponent, { size: 'lg' });
        modalRef.componentInstance.modalTitle = text;
        modalRef.componentInstance.hasMore.set(hasMore);
        modalRef.componentInstance.infoMessage = infoMessage;
        if (initialValue !== undefined) {
            modalRef.componentInstance.result = initialValue;
        }
        return modalRef.result;
    }
}
