import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TOptions } from '../base.widget.component';
import { ModalEditWidgetOptionsComponent } from '@app/_modals/modal-edit-widget-options/modal-edit-widget-options.component';
import { ModalBaseService } from '@app/_modals/modal-base-service';

export enum OptionType {
    Number,
    String,
    Boolean,
}
@Component({
    selector: 'widget-options',
    templateUrl: './widget-options.component.html',
    styleUrls: ['./widget-options.component.scss'],
    host: { class: 'edit mb-0' },
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetOptionsComponent {
    options = input<TOptions>();

    updated = output<any>();
    deleted = output<any>();

    #modal = inject(ModalBaseService);

    onOptionsClicked = () => this.#modal.open(ModalEditWidgetOptionsComponent, this.options(), this.updated);
}
