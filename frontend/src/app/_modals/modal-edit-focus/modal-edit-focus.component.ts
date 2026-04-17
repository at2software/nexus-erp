import { ChangeDetectionStrategy, Component, inject, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Focus } from '@models/focus/focus.model';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import moment from 'moment';
import { FormsModule } from '@angular/forms';
import { Serializable } from '@models/serializable';
import { IHasFoci } from '@models/focus/hasFoci.interface';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';


@Component({
    selector: 'modal-edit-focus',
    templateUrl: './modal-edit-focus.component.html',
    styleUrls: ['./modal-edit-focus.component.scss'],
    standalone: true,
    imports: [SearchInputComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalEditFocusComponent extends ModalBaseComponent<Focus> {

    @ViewChild(SearchInputComponent) project:SearchInputComponent

    title         : string = ''
    result        : string = ''
    focus         : Focus
    commentText   : string = ''
    dateTimeText  : string = ''
    durationText  : string = ''
    initialParent?: IHasFoci
    get initialParentSerializable(): Serializable | undefined {
        return this.initialParent as any
    }

    #activeModal = inject(NgbActiveModal)

    init(focus:Focus): void {
        this.title = "Focus"
        this.focus = focus
        this.commentText = this.focus.comment || ''
        this.dateTimeText = this.focus.time_started().format('DD.MM.YYYY HH:mm')
        this.durationText = this.focus.duration.toString()
        this.initialParent = this.focus.parent
    }
    onSuccess() {
        const payload:any = {
            'started_at': moment(this.dateTimeText, 'DD.MM.YYYY hh:mm').toISOString(true),
            'duration'  : parseFloat(this.durationText),
            'comment'   : this.commentText
        }
        if (this.project.selected()) {
            payload['parent_path'] = this.project.selected()?.getApiPathWithId()
        }
        this.focus.update(payload).subscribe()
        return this.focus
    }

    decline = () => this.#activeModal.close(undefined)
    dismiss = () => this.#activeModal.dismiss()

}