import { Component, ElementRef, Injectable, ViewChild, AfterViewInit, inject } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from 'src/pipes/safe.pipe';
import { ModalBaseComponent } from '../modal-base.component';



@Component({
    selector: 'modal-input',
    templateUrl: './modal-input.component.html',
    styleUrls: ['./modal-input.component.scss'],
    standalone: true,
    imports: [FormsModule, HotkeyDirective, SafePipe]
})
export class ModalInputComponent extends ModalBaseComponent<string> implements AfterViewInit {
    @ViewChild('inputField') inputField: ElementRef

    modalTitle: string = ''
    result: string = ''
    hasMore: boolean = false
    infoMessage?: string

    activeModal: NgbActiveModal = inject(NgbActiveModal)

    init(args: any): void {
        this.modalTitle = args.title
        this.infoMessage = args.message
    }
    onSuccess() {
        return this.result
    }

    ngAfterViewInit() {
        this.inputField.nativeElement.focus()
    }
    decline = () => this.activeModal.close(undefined)
    accept = () => this.activeModal.close({text: this.result, more: false})
    more = () => this.activeModal.close({text: this.result, more: true})
    dismiss = () => this.activeModal.dismiss()

}

@Injectable({ providedIn: 'root' })
export class InputModalService {

    modalService = inject(NgbModal)

    open(text: string, hasMore:boolean = false, infoMessage?: string, initialValue?: string): Promise<{ text: string, more: boolean }|undefined> {
        const modalRef = this.modalService.open(ModalInputComponent, { size: 'lg' });
        modalRef.componentInstance.modalTitle = text
        modalRef.componentInstance.hasMore = hasMore
        modalRef.componentInstance.infoMessage = infoMessage
        if (initialValue !== undefined) {
            modalRef.componentInstance.result = initialValue
        }
        return modalRef.result;
    }

}