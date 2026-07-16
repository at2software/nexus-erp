import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ModalBaseComponent } from '../modal-base.component';
import { SearchInputComponent } from '@app/_shards/search-input/search-input.component';
import { Serializable } from '@models/serializable';

@Component({
    selector: 'modal-search',
    imports: [SearchInputComponent],
    templateUrl: './modal-search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalSearchComponent extends ModalBaseComponent<Serializable> {
    onlyClass = '';
    label = 'select';
    #result?: Serializable;

    init(onlyClass: string, label = 'select') {
        this.onlyClass = onlyClass;
        this.label = label;
    }

    onSuccess() {
        return this.#result!;
    }

    onSelected(item: Serializable) {
        this.#result = item;
        this.accept();
    }
}
