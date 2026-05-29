import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Focus } from '@models/focus/focus.model';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import moment from 'moment';
import { FormsModule } from '@angular/forms';
import { Serializable } from '@models/serializable';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';

@Component({
    selector: 'modal-edit-focus',
    templateUrl: './modal-edit-focus.component.html',
    styleUrls: ['./modal-edit-focus.component.scss'],
    standalone: true,
    imports: [SearchInputComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEditFocusComponent extends ModalBaseComponent<Focus> {
    private readonly project = viewChild.required(SearchInputComponent);

    readonly title = signal('Focus');
    readonly focus = signal<Focus>(null!);
    readonly commentText = signal('');
    readonly dateTimeText = signal('');
    readonly durationText = signal('');
    readonly initialParent = computed(() => this.focus()?.parent as unknown as Serializable | undefined);

    #activeModal = inject(NgbActiveModal);

    init(focus: Focus): void {
        this.focus.set(focus);
        this.commentText.set(focus.comment || '');
        this.dateTimeText.set(focus.momentStarted().format('DD.MM.YYYY HH:mm'));
        this.durationText.set(focus.duration.toString());
    }

    onSuccess() {
        const focus = this.focus();
        const payload: any = {
            started_at: moment(this.dateTimeText(), 'DD.MM.YYYY HH:mm').toISOString(true),
            duration: parseFloat(this.durationText()),
            comment: this.commentText(),
        };
        const selected = this.project().selected();
        if (selected) payload['parent_path'] = selected.apiPathWithId();
        focus.update(payload).subscribe();
        return focus;
    }

    override decline = () => this.#activeModal.close(undefined);
}
